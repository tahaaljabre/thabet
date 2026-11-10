const fs = require('fs');
const path = require('path');

describe('Backup renderer IPC contract', () => {
  const preload = fs.readFileSync(path.join(__dirname, '../../renderer/preload.js'), 'utf8');
  const ipcWrappers = fs.readFileSync(path.join(__dirname, '../../renderer/js/core/ipc.js'), 'utf8');

  test.each([
    ['backupDB', 'backup-db'],
    ['restoreDB', 'restore-db'],
    ['uploadCloudBackup', 'upload-cloud-backup'],
    ['listCloudBackups', 'list-cloud-backups'],
    ['restoreCloudBackup', 'restore-cloud-backup']
  ])('%s is exposed and invokes %s', (apiName, channelName) => {
    expect(preload).toContain(`${apiName}:`);
    expect(preload).toContain(`ipcRenderer.invoke('${channelName}'`);
    expect(ipcWrappers).toContain(`createIpcCall('${apiName}')`);
  });
});
