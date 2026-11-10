const { app } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DRIVE_FOLDER_ID = '1bfQtvGAJkrcCxvxFEmopCYwJ8OaeWywT';
const DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}?usp=sharing`;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function getCurrentAppVersion() {
  try {
    if (app && typeof app.getVersion === 'function') {
      const v = app.getVersion();
      if (v && v !== '0.0.0') return v;
    }
  } catch (_) {}
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
    return pkg.version || '1.0.0';
  } catch (_) {
    return '1.0.0';
  }
}

function normalizeVersion(versionStr) {
  if (!versionStr) return null;
  const match = String(versionStr).match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  return `${Number(match[1])}.${Number(match[2])}.${Number(match[3] || 0)}`;
}

function compareVersions(v1, v2) {
  const n1 = normalizeVersion(v1);
  const n2 = normalizeVersion(v2);
  if (!n1 && !n2) return 0;
  if (!n1) return -1;
  if (!n2) return 1;
  const parts1 = n1.split('.').map(Number);
  const parts2 = n2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }
  return 0;
}

function decodeHtmlEntities(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\u003d/g, '=')
    .replace(/\\u0026/g, '&');
}

function httpsGetText(url, cookies = [], redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 8) {
      return reject(new Error('Too many redirects while contacting Google Drive'));
    }
    const headers = {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8'
    };
    if (cookies.length > 0) {
      headers.Cookie = cookies.join('; ');
    }

    const req = https.get(url, { headers, timeout: 20000 }, (res) => {
      const setCookies = res.headers['set-cookie'] || [];
      const mergedCookies = [
        ...cookies,
        ...setCookies.map(c => c.split(';')[0])
      ];

      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        const nextUrl = new URL(res.headers.location, url).toString();
        return resolve(httpsGetText(nextUrl, mergedCookies, redirectCount + 1));
      }

      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} when fetching Google Drive`));
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });
    req.on('error', reject);
  });
}

function extractEntriesFromEmbeddedView(html) {
  const entries = [];
  const seen = new Set();

  // Pattern 1: embeddedfolderview entry blocks
  const entryRegex = /id="entry-([A-Za-z0-9_-]{15,})"[\s\S]*?<div class="flip-entry-title">([^<]+)<\/div>/g;
  let match;
  while ((match = entryRegex.exec(html)) !== null) {
    const fileId = match[1].trim();
    const fileName = decodeHtmlEntities(match[2].trim());
    if (fileId && fileName && !seen.has(fileId)) {
      seen.add(fileId);
      entries.push({ fileId, fileName });
    }
  }

  // Pattern 2: links with /file/d/<ID>/view and nearby title
  const linkRegex = /\/file\/d\/([A-Za-z0-9_-]{15,})\/view[^"]*"[\s\S]{0,600}?<div class="flip-entry-title">([^<]+)<\/div>/g;
  while ((match = linkRegex.exec(html)) !== null) {
    const fileId = match[1].trim();
    const fileName = decodeHtmlEntities(match[2].trim());
    if (fileId && fileName && !seen.has(fileId)) {
      seen.add(fileId);
      entries.push({ fileId, fileName });
    }
  }

  // Pattern 3: JSON-like structures in main Drive folder view
  const jsonPairRegex = /\["([A-Za-z0-9_-]{20,45})"(?:,[^[\]]*){0,4},"([^"]+\.(?:exe|json|zip|msi))"/gi;
  while ((match = jsonPairRegex.exec(html)) !== null) {
    const fileId = match[1].trim();
    const fileName = decodeHtmlEntities(match[2].trim());
    if (fileId && fileName && !seen.has(fileId)) {
      seen.add(fileId);
      entries.push({ fileId, fileName });
    }
  }

  return entries;
}

async function listDriveFolderFiles(folderId = DRIVE_FOLDER_ID) {
  const embeddedUrl = `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#list`;
  let entries = [];
  try {
    const html = await httpsGetText(embeddedUrl);
    entries = extractEntriesFromEmbeddedView(html);
  } catch (_) {}

  if (entries.length === 0) {
    const folderUrl = `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
    const html = await httpsGetText(folderUrl);
    entries = extractEntriesFromEmbeddedView(html);
  }

  return entries;
}

async function checkForAppUpdates() {
  const currentVersion = getCurrentAppVersion();
  try {
    const files = await listDriveFolderFiles(DRIVE_FOLDER_ID);
    const exeFiles = files.filter(f => /\.exe$/i.test(f.fileName));

    if (exeFiles.length === 0) {
      return {
        success: true,
        updateAvailable: false,
        currentVersion,
        latestVersion: currentVersion,
        folderUrl: DRIVE_FOLDER_URL,
        message: 'NO_INSTALLER_IN_FOLDER'
      };
    }

    const candidates = exeFiles.map(file => {
      const extractedVersion = normalizeVersion(file.fileName);
      return {
        ...file,
        version: extractedVersion
      };
    });

    candidates.sort((a, b) => {
      if (a.version && b.version) return compareVersions(b.version, a.version);
      if (a.version) return -1;
      if (b.version) return 1;
      return b.fileName.localeCompare(a.fileName);
    });

    const best = candidates[0];
    const latestVersion = best.version || currentVersion;
    const isNewer = best.version
      ? compareVersions(best.version, currentVersion) > 0
      : true;

    return {
      success: true,
      updateAvailable: isNewer,
      currentVersion,
      latestVersion,
      fileId: best.fileId,
      fileName: best.fileName,
      folderUrl: DRIVE_FOLDER_URL
    };
  } catch (error) {
    return {
      success: false,
      updateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
      folderUrl: DRIVE_FOLDER_URL,
      error: error.message
    };
  }
}

function buildConfirmedDriveDownloadUrl(html, fileId) {
  const cleanHtml = decodeHtmlEntities(html);
  const actionMatch = cleanHtml.match(/<form[^>]+id="download-form"[^>]+action="([^"]+)"/i)
    || cleanHtml.match(/action="(https:\/\/drive\.usercontent\.google\.com\/download[^"]*)"/i);
  const baseUrl = actionMatch ? actionMatch[1] : 'https://drive.usercontent.google.com/download';
  const urlObj = new URL(baseUrl);

  const inputRegex = /<input[^>]+type="hidden"[^>]+name="([^"]+)"[^>]+value="([^"]*)"/gi;
  let match;
  while ((match = inputRegex.exec(cleanHtml)) !== null) {
    urlObj.searchParams.set(match[1], match[2]);
  }

  if (!urlObj.searchParams.has('id')) urlObj.searchParams.set('id', fileId);
  if (!urlObj.searchParams.has('export')) urlObj.searchParams.set('export', 'download');
  if (!urlObj.searchParams.has('confirm')) urlObj.searchParams.set('confirm', 't');

  return urlObj.toString();
}

function downloadDriveFileToPath(fileId, destPath, onProgress) {
  const initialUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;

  return new Promise((resolve, reject) => {
    const followDownload = (url, cookies = [], redirectCount = 0, confirmedHtmlAttempted = false) => {
      if (redirectCount > 10) {
        return reject(new Error('تجاوز عدد التحويلات المسموح به أثناء تحميل التحديث'));
      }

      const headers = {
        'User-Agent': USER_AGENT,
        'Accept': '*/*'
      };
      if (cookies.length > 0) {
        headers.Cookie = cookies.join('; ');
      }

      const req = https.get(url, { headers, timeout: 60000 }, (res) => {
        const setCookies = res.headers['set-cookie'] || [];
        const mergedCookies = [
          ...cookies,
          ...setCookies.map(c => c.split(';')[0])
        ];

        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          const nextUrl = new URL(res.headers.location, url).toString();
          return followDownload(nextUrl, mergedCookies, redirectCount + 1, confirmedHtmlAttempted);
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return reject(new Error(`فشل تحميل التحديث من جوجل درايف (HTTP ${res.statusCode})`));
        }

        const contentType = String(res.headers['content-type'] || '').toLowerCase();
        if (contentType.includes('text/html')) {
          const chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
            if (confirmedHtmlAttempted) {
              return reject(new Error('تعذر الحصول على رابط التحميل المباشر من جوجل درايف. تأكد من أن الملف داخل المجلد متاح للجميع (Anyone with the link).'));
            }
            const html = Buffer.concat(chunks).toString('utf8');
            const confirmedUrl = buildConfirmedDriveDownloadUrl(html, fileId);
            followDownload(confirmedUrl, mergedCookies, redirectCount + 1, true);
          });
          return;
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10) || 0;
        let downloadedBytes = 0;
        const fileStream = fs.createWriteStream(destPath);

        res.on('data', chunk => {
          downloadedBytes += chunk.length;
          if (typeof onProgress === 'function') {
            const percent = totalBytes > 0
              ? Math.min(99, Math.round((downloadedBytes / totalBytes) * 100))
              : 50;
            onProgress({
              percent,
              downloadedBytes,
              totalBytes,
              transferredMB: (downloadedBytes / (1024 * 1024)).toFixed(1),
              totalMB: totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : null
            });
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            try {
              const stat = fs.statSync(destPath);
              if (stat.size < 1024 * 100) {
                return reject(new Error('الملف المحمّل غير مكتمل أو صغير جداً'));
              }
              const fd = fs.openSync(destPath, 'r');
              const headerBuf = Buffer.alloc(2);
              fs.readSync(fd, headerBuf, 0, 2, 0);
              fs.closeSync(fd);
              if (headerBuf[0] !== 0x4D || headerBuf[1] !== 0x5A) {
                return reject(new Error('الملف المحمّل ليس ملف تثبيت صالحاً (.exe)'));
              }
              if (typeof onProgress === 'function') {
                onProgress({
                  percent: 100,
                  downloadedBytes: stat.size,
                  totalBytes: stat.size,
                  transferredMB: (stat.size / (1024 * 1024)).toFixed(1),
                  totalMB: (stat.size / (1024 * 1024)).toFixed(1)
                });
              }
              resolve(destPath);
            } catch (verifyErr) {
              reject(verifyErr);
            }
          });
        });

        fileStream.on('error', err => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error('انتهت مهلة الاتصال أثناء تحميل التحديث'));
      });
      req.on('error', err => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    };

    followDownload(initialUrl);
  });
}

async function downloadAndInstallAppUpdate(mainWindow, targetFileId = null, targetVersion = null) {
  let fileId = targetFileId;
  let version = targetVersion;

  if (!fileId) {
    const check = await checkForAppUpdates();
    if (!check.fileId) {
      throw new Error('لم يتم العثور على ملف تثبيت (.exe) داخل مجلد التحديثات في جوجل درايف');
    }
    fileId = check.fileId;
    version = check.latestVersion || 'latest';
  }

  const tempDir = app.getPath('temp');
  const safeVersion = String(version || 'latest').replace(/[^a-zA-Z0-9._-]/g, '_');
  const destPath = path.join(tempDir, `Thabit-Update-${safeVersion}-${Date.now()}.exe`);

  const sendProgress = (progressData) => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send('app-update-progress', progressData);
    }
  };

  await downloadDriveFileToPath(fileId, destPath, sendProgress);

  const child = spawn(destPath, ['--updated'], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();

  setTimeout(() => {
    app.quit();
  }, 600);

  return {
    success: true,
    installerPath: destPath,
    version
  };
}

module.exports = {
  DRIVE_FOLDER_ID,
  DRIVE_FOLDER_URL,
  getCurrentAppVersion,
  normalizeVersion,
  compareVersions,
  extractEntriesFromEmbeddedView,
  checkForAppUpdates,
  downloadAndInstallAppUpdate
};
