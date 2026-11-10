function parseShortcut(input) {
  if (input.type !== 'keyDown' || input.isAutoRepeat || input.alt || input.meta) return null;
  const functionKey = /^F(?:[1-9]|1[0-2])$/i.test(input.code || '') ? input.code.toUpperCase()
    : /^F(?:[1-9]|1[0-2])$/i.test(input.key || '') ? input.key.toUpperCase() : '';
  const digit = /^Digit([0-9])$/i.exec(input.code || '')?.[1]
    || (/^[0-9]$/.test(input.key || '') ? input.key : '');
  if (!functionKey && !(input.control && digit && (!input.shift || digit === '1' || digit === '2'))) return null;
  return {
    section: /^F[1-8]$/.test(functionKey) || Boolean(input.control && !input.shift && /^[1-8]$/.test(digit)),
    payload: {
      key: functionKey || digit,
      code: functionKey || `Digit${digit}`,
      ctrlKey: Boolean(input.control && !functionKey),
      shiftKey: Boolean(input.shift)
    }
  };
}

function attachShortcutRouter(app, getMainWindow) {
  app.on('browser-window-created', (_event, sourceWindow) => {
    sourceWindow.webContents.on('before-input-event', (event, input) => {
      const shortcut = parseShortcut(input);
      if (!shortcut) return;
      const mainWindow = getMainWindow();
      const target = shortcut.section && mainWindow && !mainWindow.isDestroyed()
        ? mainWindow.webContents : sourceWindow.webContents;
      event.preventDefault();
      target.send('app-function-shortcut', shortcut.payload);
    });
  });
}

module.exports = { parseShortcut, attachShortcutRouter };
