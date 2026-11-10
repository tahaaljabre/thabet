// __mocks__/electron.js
module.exports = {
  app: {
    getPath: (name) => {
      if (name === 'userData') {
        return __dirname; // Mocked path for tests
      }
      return '';
    },
  },
  dialog: {
    showSaveDialog: jest.fn(),
    showOpenDialog: jest.fn()
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  BrowserWindow: jest.fn().mockImplementation(() => {
    return {
      loadFile: jest.fn(),
      webContents: {
        on: jest.fn(),
        send: jest.fn()
      }
    };
  })
};
