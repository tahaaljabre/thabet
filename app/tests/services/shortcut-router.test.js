const { EventEmitter } = require('events');
const { attachShortcutRouter } = require('../../main/utils/shortcut-router');

function makeWindow() {
  return {
    webContents: Object.assign(new EventEmitter(), { send: jest.fn() }),
    isDestroyed: () => false
  };
}

test('section shortcuts keep reaching the main window after a section window gains focus', () => {
  const app = new EventEmitter();
  const main = makeWindow();
  const section = makeWindow();
  attachShortcutRouter(app, () => main);
  app.emit('browser-window-created', {}, main);
  app.emit('browser-window-created', {}, section);

  const firstEvent = { preventDefault: jest.fn() };
  main.webContents.emit('before-input-event', firstEvent, {
    type: 'keyDown', code: 'Digit1', key: '1', control: true
  });
  const secondEvent = { preventDefault: jest.fn() };
  section.webContents.emit('before-input-event', secondEvent, {
    type: 'keyDown', code: 'Digit2', key: '2', control: true
  });
  const repeatEvent = { preventDefault: jest.fn() };
  section.webContents.emit('before-input-event', repeatEvent, {
    type: 'keyDown', code: 'Digit1', key: '1', control: true
  });

  expect(firstEvent.preventDefault).toHaveBeenCalledTimes(1);
  expect(secondEvent.preventDefault).toHaveBeenCalledTimes(1);
  expect(repeatEvent.preventDefault).toHaveBeenCalledTimes(1);
  expect(main.webContents.send).toHaveBeenNthCalledWith(1, 'app-function-shortcut', {
    key: '1', code: 'Digit1', ctrlKey: true, shiftKey: false
  });
  expect(main.webContents.send).toHaveBeenNthCalledWith(2, 'app-function-shortcut', {
    key: '2', code: 'Digit2', ctrlKey: true, shiftKey: false
  });
  expect(main.webContents.send).toHaveBeenNthCalledWith(3, 'app-function-shortcut', {
    key: '1', code: 'Digit1', ctrlKey: true, shiftKey: false
  });
  expect(section.webContents.send).not.toHaveBeenCalled();
});
