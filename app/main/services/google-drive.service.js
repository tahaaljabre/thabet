const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { google } = require('googleapis');
const { authenticate } = require('@google-cloud/local-auth');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const GOOGLE_OAUTH_FILE_NAME = 'google_oauth_credentials.json';
const getCredentialsPath = () => {
  const configuredPath = String(process.env.THABIT_GOOGLE_OAUTH_CREDENTIALS || '').trim();
  if (configuredPath) {
    if (!path.isAbsolute(configuredPath)) {
      const error = new Error('THABIT_GOOGLE_OAUTH_CREDENTIALS must be an absolute path.');
      error.code = 'GOOGLE_DRIVE_CREDENTIALS_PATH_INVALID';
      throw error;
    }
    return path.normalize(configuredPath);
  }
  const defaultPath = path.join(app.getPath('userData'), GOOGLE_OAUTH_FILE_NAME);
  return defaultPath;
};
const getTokenPath = () => path.join(app.getPath('userData'), 'google_drive_token.json');

function readOAuthClientCredentials() {
  const credentialsPath = getCredentialsPath();
  if (!fs.existsSync(credentialsPath)) {
    const error = new Error(
      `Google Drive credentials are not configured. Place ${GOOGLE_OAUTH_FILE_NAME} in the application data directory or set THABIT_GOOGLE_OAUTH_CREDENTIALS.`
    );
    error.code = 'GOOGLE_DRIVE_NOT_CONFIGURED';
    throw error;
  }
  let keys;
  try {
    keys = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  } catch (cause) {
    const error = new Error('Google Drive credentials file is not valid JSON.');
    error.code = 'GOOGLE_DRIVE_CREDENTIALS_INVALID';
    error.cause = cause;
    throw error;
  }
  const key = keys.installed || keys.web;
  if (!key?.client_id || !key?.client_secret) {
    const error = new Error('Google Drive credentials file is missing OAuth client fields.');
    error.code = 'GOOGLE_DRIVE_CREDENTIALS_INVALID';
    throw error;
  }
  return { credentialsPath, key };
}

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.authPromise = null;
  }

  /**
   * Reads previously authorized credentials from the save file.
   *
   * @return {Promise<OAuth2Client|null>}
   */
  async loadSavedCredentialsIfExist() {
    try {
      const tokenPath = getTokenPath();
      const content = fs.readFileSync(tokenPath, 'utf8');
      const credentials = JSON.parse(content);
      if (!credentials.client_id || !credentials.client_secret || !credentials.refresh_token) {
        fs.unlinkSync(tokenPath);
        return null;
      }
      return google.auth.fromJSON(credentials);
    } catch (err) {
      return null;
    }
  }

  /**
   * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
   *
   * @param {OAuth2Client} client
   * @return {Promise<void>}
   */
  async saveCredentials(client) {
    const { key } = readOAuthClientCredentials();
    if (!client.credentials?.refresh_token) {
      try {
        await client.revokeCredentials();
      } catch (e) {
        console.warn('Could not revoke token:', e.message);
      }
      const error = new Error('تم إعادة تهيئة الربط لعدم توفر رمز التحديث. يرجى الضغط على ربط حساب Google والمحاولة مرة أخرى.');
      error.code = 'GOOGLE_DRIVE_AUTH_INCOMPLETE';
      throw error;
    }
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    const tokenPath = getTokenPath();
    fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
    fs.writeFileSync(tokenPath, payload, { encoding: 'utf8' });
    try {
      fs.chmodSync(tokenPath, 0o600);
    } catch (error) {
      console.warn('Could not restrict Google Drive token file permissions:', error.message);
    }
  }

  /**
   * Load or request or authorization to call APIs.
   *
   */
  async authorize() {
    const { credentialsPath } = readOAuthClientCredentials();

    let client = await this.loadSavedCredentialsIfExist();
    if (client) {
      return client;
    }

    client = await authenticate({
      scopes: SCOPES,
      keyfilePath: credentialsPath,
    });

    if (client.credentials) {
      await this.saveCredentials(client);
    }
    return client;
  }

  async getDriveClient() {
    if (this.drive) return this.drive;
    if (!this.authPromise) {
      this.authPromise = (async () => {
        const authClient = await this.authorize();
        await authClient.getAccessToken();
        return google.drive({ version: 'v3', auth: authClient });
      })();
    }
    try {
      this.drive = await this.authPromise;
      return this.drive;
    } finally {
      this.authPromise = null;
    }
  }

  resetAuthorization({ deleteToken = false } = {}) {
    this.drive = null;
    this.authPromise = null;
    if (!deleteToken) return;
    try {
      const tokenPath = getTokenPath();
      if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath);
    } catch (error) {
      console.error('Failed to clear Google Drive token:', error);
    }
  }

  isUnregisteredCaller(error) {
    const message = String(error?.message || '');
    return Number(error?.code || error?.status) === 401
      || (Number(error?.code || error?.status) === 403 && /unregistered callers|established identity/i.test(message));
  }

  requiresFreshConsent(error) {
    const status = Number(error?.code || error?.status);
    const message = String(error?.message || '');
    return status === 401 || /invalid_grant|token has been expired or revoked/i.test(message);
  }

  async withAuthorizedDrive(operation) {
    try {
      return await operation(await this.getDriveClient());
    } catch (error) {
      if (!this.isUnregisteredCaller(error)) throw error;
      // A transient Drive 403 can occur without invalidating the saved OAuth
      // refresh token. Keep it so restore/backup does not reopen the browser.
      this.resetAuthorization({ deleteToken: this.requiresFreshConsent(error) });
      try {
        return await operation(await this.getDriveClient());
      } catch (retryError) {
        retryError.code = retryError.code || 'GOOGLE_DRIVE_AUTH_REQUIRED';
        throw retryError;
      }
    }
  }

  /**
   * Uploads the database to Google Drive inside 'Thabit Backups' folder.
   */
  async uploadBackup() {
    try {
      return await this.withAuthorizedDrive(async drive => {
        const folderName = 'Thabit Backups';
        let folderId = await this.getFolderId(drive, folderName);
        if (!folderId) folderId = await this.createFolder(drive, folderName);

        const dbPath = path.join(app.getPath('userData'), 'database.sqlite');
        if (!fs.existsSync(dbPath)) {
          const error = new Error('Database file was not found.');
          error.code = 'BACKUP_DATABASE_NOT_FOUND';
          throw error;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `database_${timestamp}.sqlite`;
        const file = await drive.files.create({
          resource: { name: fileName, parents: [folderId] },
          media: {
            mimeType: 'application/x-sqlite3',
            body: fs.createReadStream(dbPath)
          },
          fields: 'id'
        });

        console.log('File Id:', file.data.id);
        
        try {
          const infoPath = path.join(app.getPath('userData'), 'cloud-backup-info.json');
          fs.writeFileSync(infoPath, JSON.stringify({ lastBackupDate: new Date().toISOString() }));
        } catch(e) {}
        
        return { success: true, code: 'CLOUD_BACKUP_SUCCESS', fileId: file.data.id };
      });
    } catch (error) {
      console.error('Error uploading backup:', error);
      return this.errorResult(error);
    }
  }

  async listBackups() {
    try {
      return await this.withAuthorizedDrive(async drive => {
        const folderId = await this.getFolderId(drive, 'Thabit Backups');
        if (!folderId) return { success: true, backups: [] };
        const response = await drive.files.list({
          q: `'${folderId}' in parents and trashed=false and name contains 'database_'`,
          fields: 'files(id,name,createdTime,modifiedTime,size,mimeType)',
          spaces: 'drive',
          orderBy: 'modifiedTime desc',
          pageSize: 100
        });
        const backups = (response.data.files || [])
          .filter(file => file.name?.toLowerCase().endsWith('.sqlite'))
          .map(file => ({
            id: file.id,
            name: file.name,
            createdTime: file.createdTime,
            modifiedTime: file.modifiedTime,
            size: Number(file.size) || 0
          }));
        return { success: true, backups };
      });
    } catch (error) {
      console.error('Error listing cloud backups:', error);
      return this.errorResult(error);
    }
  }

  async downloadBackup(fileId) {
    if (!/^[A-Za-z0-9_-]{10,}$/.test(String(fileId || ''))) {
      const error = new Error('Invalid Google Drive file identifier.');
      error.code = 'CLOUD_BACKUP_INVALID_FILE';
      throw error;
    }
    return await this.withAuthorizedDrive(async drive => {
      const folderId = await this.getFolderId(drive, 'Thabit Backups');
      if (!folderId) {
        const error = new Error('Cloud backup folder was not found.');
        error.code = 'CLOUD_BACKUP_FILE_NOT_FOUND';
        throw error;
      }

      const metadataResponse = await drive.files.get({
        fileId,
        fields: 'id,name,parents,mimeType,size,createdTime,modifiedTime'
      });
      const metadata = metadataResponse.data;
      if (!metadata.parents?.includes(folderId) || !metadata.name?.toLowerCase().endsWith('.sqlite')) {
        const error = new Error('The selected file is not a Thabit SQLite backup.');
        error.code = 'CLOUD_BACKUP_INVALID_FILE';
        throw error;
      }

      const tempPath = path.join(app.getPath('temp'), `thabit-cloud-restore-${Date.now()}.sqlite`);
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(tempPath, { flags: 'wx' });
        response.data.on('error', reject);
        output.on('error', reject);
        output.on('finish', resolve);
        response.data.pipe(output);
      });
      return { tempPath, metadata };
    });
  }

  errorResult(error) {
    let code = error.code || 'CLOUD_BACKUP_FAILED';
    if (Number(error?.status) === 403 && code === 403) code = 'GOOGLE_DRIVE_API_FORBIDDEN';
    return { success: false, code, message: error.message };
  }

  async getFolderId(drive, folderName) {
    const res = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });
    const files = res.data.files;
    if (files.length > 0) {
      return files[0].id;
    }
    return null;
  }

  async createFolder(drive, folderName) {
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };
    const file = await drive.files.create({
      resource: fileMetadata,
      fields: 'id'
    });
    return file.data.id;
  }
}

module.exports = new GoogleDriveService();
