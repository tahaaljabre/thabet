const path = require('path');
const { Worker } = require('worker_threads');
const { app, shell } = require('electron');

function isAllowedGoogleAuthorizationUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && url.hostname === 'accounts.google.com';
  } catch (error) {
    return false;
  }
}

function restoreError(serialized) {
  const error = new Error(serialized?.message || 'Cloud operation failed.');
  if (serialized?.code !== undefined) error.code = serialized.code;
  if (serialized?.status !== undefined) error.status = serialized.status;
  return error;
}

function runCloudOperation(operation, args = []) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, '..', 'workers', 'google-drive.worker.js'), {
      workerData: {
        operation,
        args,
        paths: {
          appPath: app.getAppPath(),
          userData: app.getPath('userData'),
          temp: app.getPath('temp')
        }
      }
    });

    let settled = false;
    let authTimeout = null;
    const finish = callback => value => {
      if (settled) return;
      settled = true;
      if (authTimeout) clearTimeout(authTimeout);
      callback(value);
      worker.terminate().catch(() => {});
    };
    const resolveOnce = finish(resolve);
    const rejectOnce = finish(reject);

    worker.on('message', message => {
      if (message?.type === 'open-external') {
        if (!isAllowedGoogleAuthorizationUrl(message.url)) {
          const error = new Error('Invalid Google authorization URL.');
          error.code = 'GOOGLE_DRIVE_AUTH_URL_INVALID';
          rejectOnce(error);
          return;
        }
        Promise.resolve(shell.openExternal(message.url)).catch(rejectOnce);
        
        // Start auth timeout
        authTimeout = setTimeout(() => {
          if (!settled) {
            const error = new Error('انتهت مهلة تسجيل الدخول. يرجى المحاولة مرة أخرى.');
            error.code = 'GOOGLE_DRIVE_AUTH_TIMEOUT';
            rejectOnce(error);
          }
        }, 90 * 1000); // 90 seconds timeout
        return;
      }
      if (message?.success) resolveOnce(message.result);
      else rejectOnce(restoreError(message?.error));
    });
    worker.once('error', rejectOnce);
    worker.once('exit', code => {
      if (!settled && code !== 0) {
        rejectOnce(new Error(`Cloud worker stopped unexpectedly (${code}).`));
      }
    });
  });
}

module.exports = {
  uploadBackup: () => runCloudOperation('upload'),
  listBackups: () => runCloudOperation('list'),
  downloadBackup: fileId => runCloudOperation('download', [fileId])
};
