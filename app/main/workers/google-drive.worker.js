const path = require('path');
const Module = require('module');
const { parentPort, workerData } = require('worker_threads');

// Some packaged Windows launches expose `SystemRoot` with different casing.
// Normalize it as a defensive fallback for dependencies that read only the
// uppercase spelling. Browser authorization itself is opened by Electron
// below, without invoking PowerShell.
if (process.platform === 'win32' && !process.env.SYSTEMROOT) {
  process.env.SYSTEMROOT = process.env.SystemRoot
    || process.env.WINDIR
    || process.env.windir
    || 'C:\\Windows';
}

// Google Drive service normally obtains these locations from Electron's app
// object. A worker thread does not own that object, so expose only the small
// read-only path contract the service needs.
const originalLoad = Module._load;
Module._load = function loadWithElectronPaths(request, parent, isMain) {
  if (request === 'electron') {
    return {
      app: {
        getAppPath: () => workerData.paths.appPath,
        getPath: name => {
          if (name === 'userData') return workerData.paths.userData;
          if (name === 'temp') return workerData.paths.temp;
          throw new Error(`Unsupported Electron path requested by cloud worker: ${name}`);
        }
      }
    };
  }
  if (request === 'open') {
    return async target => {
      parentPort.postMessage({
        type: 'open-external',
        url: String(target || '')
      });
      return { unref() {} };
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

function serializeError(error) {
  return {
    message: error?.message || String(error),
    code: error?.code,
    status: error?.status
  };
}

(async () => {
  const googleDriveService = require(path.join(__dirname, '..', 'services', 'google-drive.service'));
  let result;
  if (workerData.operation === 'upload') {
    result = await googleDriveService.uploadBackup();
  } else if (workerData.operation === 'list') {
    result = await googleDriveService.listBackups();
  } else if (workerData.operation === 'download') {
    result = await googleDriveService.downloadBackup(workerData.args?.[0]);
  } else {
    throw new Error(`Unsupported cloud operation: ${workerData.operation}`);
  }
  parentPort.postMessage({ success: true, result });
})().catch(error => {
  parentPort.postMessage({ success: false, error: serializeError(error) });
});
