const { EventEmitter } = require('events');

const mockWorkerConstructor = jest.fn();
const mockOpenExternal = jest.fn(() => Promise.resolve());
jest.mock('worker_threads', () => ({
  Worker: mockWorkerConstructor
}));
jest.mock('electron', () => ({
  app: {
    getAppPath: jest.fn(() => 'C:\\app'),
    getPath: jest.fn(name => name === 'userData' ? 'C:\\user-data' : 'C:\\temp')
  },
  shell: {
    openExternal: mockOpenExternal
  }
}));

describe('Cloud worker service', () => {
  let worker;

  beforeEach(() => {
    jest.resetModules();
    mockWorkerConstructor.mockReset();
    mockOpenExternal.mockClear();
    worker = new EventEmitter();
    worker.terminate = jest.fn(() => Promise.resolve());
    mockWorkerConstructor.mockReturnValue(worker);
  });

  it('runs cloud upload outside the Electron main thread and resolves its result', async () => {
    const service = require('../../main/services/cloud-worker.service');
    const pending = service.uploadBackup();

    expect(mockWorkerConstructor).toHaveBeenCalledTimes(1);
    const [, options] = mockWorkerConstructor.mock.calls[0];
    expect(options.workerData.operation).toBe('upload');
    expect(options.workerData.paths.userData).toBe('C:\\user-data');

    worker.emit('message', { success: true, result: { success: true, fileId: 'file-1' } });
    await expect(pending).resolves.toEqual({ success: true, fileId: 'file-1' });
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('opens Google authorization through Electron and keeps listening for the worker result', async () => {
    const service = require('../../main/services/cloud-worker.service');
    const pending = service.listBackups();

    worker.emit('message', {
      type: 'open-external',
      url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test'
    });
    expect(mockOpenExternal).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/v2/auth?client_id=test'
    );
    expect(worker.terminate).not.toHaveBeenCalled();

    worker.emit('message', { success: true, result: { success: true, backups: [] } });
    await expect(pending).resolves.toEqual({ success: true, backups: [] });
  });

  it('returns worker errors without freezing the main process', async () => {
    const service = require('../../main/services/cloud-worker.service');
    const pending = service.listBackups();
    worker.emit('message', {
      success: false,
      error: { message: 'Drive unavailable', code: 'DRIVE_DOWN' }
    });

    await expect(pending).rejects.toMatchObject({
      message: 'Drive unavailable',
      code: 'DRIVE_DOWN'
    });
  });
});
