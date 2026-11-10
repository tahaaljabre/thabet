const { app, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const {
  getWindowSession,
  updateWindowSession,
  copyWindowSession,
  clearWindowSession
} = require('../../services/system/users/session');

const sectionWindows = new Map();
const visibleSections = new Set();
let isQuitting = false;

function sessionContextFor(webContentsId) {
  const session = getWindowSession(webContentsId);
  if (!session) return { user: null, yearId: 1, yearName: '' };
  return {
    user: session.user || null,
    yearId: session.yearId === null || session.yearId === undefined ? 1 : session.yearId,
    yearName: session.yearName || ''
  };
}

function getOpenSectionKeys() {
  const keys = [];
  for (const key of visibleSections) {
    const win = sectionWindows.get(key);
    if (win && !win.isDestroyed() && win.isVisible()) {
      keys.push(key);
    } else {
      visibleSections.delete(key);
    }
  }
  return keys;
}

function broadcastToAllWindows(mainWindow, channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
  for (const [, win] of sectionWindows.entries()) {
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}

function destroyAllPooledWindows() {
  isQuitting = true;
  visibleSections.clear();
  for (const [, win] of sectionWindows.entries()) {
    if (win && !win.isDestroyed()) {
      try {
        clearWindowSession(win.webContents.id);
      } catch (_) {}
      try { win.destroy(); } catch (_) {}
    }
  }
  sectionWindows.clear();
}

function registerWindowHandlers(mainWindow) {
  if (app && typeof app.on === 'function') {
    app.on('before-quit', () => {
      destroyAllPooledWindows();
    });
  }

  if (mainWindow && typeof mainWindow.isDestroyed === 'function' ? !mainWindow.isDestroyed() : Boolean(mainWindow && typeof mainWindow.on === 'function')) {
    mainWindow.on('close', () => {
      destroyAllPooledWindows();
    });
    mainWindow.on('closed', () => {
      destroyAllPooledWindows();
    });
  }

  ipcMain.handle('set-session-context', async (event, context = {}) => {
    const session = getWindowSession(event.sender.id);
    // Identity always comes from the authenticated session; a renderer cannot
    // promote itself or switch user through this channel.
    if (!session || !session.role) {
      return { success: false, error: 'غير مصرح - الرجاء تسجيل الدخول' };
    }
    const patch = {};
    if (context.yearId !== undefined) patch.yearId = context.yearId;
    if (context.yearName !== undefined) patch.yearName = context.yearName;
    const updated = updateWindowSession(event.sender.id, patch) || session;
    broadcastToAllWindows(mainWindow, 'session-context-updated', {
      user: updated.user || null,
      yearId: updated.yearId === null || updated.yearId === undefined ? 1 : updated.yearId,
      yearName: updated.yearName || ''
    });
    return { success: true };
  });

  ipcMain.handle('get-session-context', async (event) => {
    return sessionContextFor(event.sender.id);
  });

  ipcMain.handle('get-open-section-windows', async () => {
    return getOpenSectionKeys();
  });

  ipcMain.handle('close-all-section-windows', async () => {
    for (const [key, win] of sectionWindows.entries()) {
      if (win && !win.isDestroyed() && win.isVisible()) {
        visibleSections.delete(key);
        win.hide();
      }
    }
    visibleSections.clear();
    const openKeys = getOpenSectionKeys();
    broadcastToAllWindows(mainWindow, 'open-sections-changed', openKeys);
    return { success: true, openSections: openKeys };
  });

  ipcMain.handle('cascade-section-windows', async () => {
    let baseX = 120;
    let baseY = 90;
    if (mainWindow && !mainWindow.isDestroyed()) {
      const [mx, my] = mainWindow.getPosition();
      baseX = mx + 44;
      baseY = my + 44;
    }
    let idx = 0;
    for (const key of getOpenSectionKeys()) {
      const win = sectionWindows.get(key);
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore();
        const offset = (idx % 7) * 32;
        win.setPosition(baseX + offset, baseY + offset, true);
        win.show();
        win.moveTop();
        idx++;
      }
    }
    return { success: true, openSections: getOpenSectionKeys() };
  });

  ipcMain.handle('notify-data-changed', async (event, info = {}) => {
    broadcastToAllWindows(mainWindow, 'app-data-updated', info);
    return { success: true };
  });

  ipcMain.handle('open-section-window', async (event, options = {}) => {
    const {
      section,
      tabId = '',
      entityId = '',
      entityName = '',
      voucherNumber = '',
      title = 'مطعم حضرموت اليمن - النظام الإداري',
      yearId,
      yearName
    } = options;

    if (!section) {
      return { success: false, error: 'Missing section name' };
    }

    const existingWin = sectionWindows.get(section);
    if (existingWin && !existingWin.isDestroyed()) {
      const wasVisible = visibleSections.has(section) && existingWin.isVisible();
      visibleSections.add(section);

      if (existingWin.isMinimized()) {
        existingWin.restore();
      }
      if (title) {
        existingWin.setTitle(title);
      }
      existingWin.show();
      existingWin.focus();
      existingWin.moveTop();
      existingWin.webContents.send('section-window-reopen', {
        section,
        tabId,
        entityId: entityId ? String(entityId) : '',
        entityName: entityName ? String(entityName) : '',
        voucherNumber: voucherNumber ? String(voucherNumber) : '',
        isFreshOpen: !wasVisible
      });
      broadcastToAllWindows(mainWindow, 'open-sections-changed', getOpenSectionKeys());

      return {
        success: true,
        alreadyOpen: wasVisible,
        openSections: getOpenSectionKeys()
      };
    }

    const openCount = getOpenSectionKeys().length;
    const cascadeOffset = (openCount % 6) * 28;
    let x;
    let y;

    if (mainWindow && !mainWindow.isDestroyed()) {
      const [mx, my] = mainWindow.getPosition();
      x = mx + 40 + cascadeOffset;
      y = my + 40 + cascadeOffset;
    }

    const iconPath = path.join(__dirname, '..', '..', '..', 'assets', 'icon.png');
    const childWin = new BrowserWindow({
      width: 1120,
      height: 760,
      minWidth: 520,
      minHeight: 420,
      ...(Number.isFinite(x) && Number.isFinite(y) ? { x, y } : {}),
      show: false,
      autoHideMenuBar: true,
      backgroundColor: '#f5ebe1',
      title,
      webPreferences: {
        preload: path.join(__dirname, '..', '..', '..', 'renderer', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    });
    childWin.setMenuBarVisibility(false);

    if (fs.existsSync(iconPath)) {
      childWin.setIcon(iconPath);
    }

    sectionWindows.set(section, childWin);
    visibleSections.add(section);

    // The new window inherits the opener's authenticated session, so its IPC
    // calls and its header context belong to the same user.
    const childWebContentsId = childWin.webContents.id;
    if (copyWindowSession(event.sender.id, childWebContentsId)) {
      const patch = {};
      if (yearId) patch.yearId = yearId;
      if (yearName !== undefined) patch.yearName = yearName;
      if (Object.keys(patch).length) updateWindowSession(childWebContentsId, patch);
    }

    broadcastToAllWindows(mainWindow, 'open-sections-changed', getOpenSectionKeys());

    childWin.once('ready-to-show', () => {
      if (!childWin.isDestroyed()) {
        childWin.show();
        childWin.focus();
      }
    });

    // Warm window pooling: hide instead of destroying on close so subsequent opens are instantaneous (<10ms)
    childWin.on('close', (closeEvent) => {
      if (!isQuitting && mainWindow && !mainWindow.isDestroyed()) {
        closeEvent.preventDefault();
        visibleSections.delete(section);
        childWin.hide();
        broadcastToAllWindows(mainWindow, 'open-sections-changed', getOpenSectionKeys());
      }
    });

    childWin.on('closed', () => {
      clearWindowSession(childWebContentsId);
      visibleSections.delete(section);
      sectionWindows.delete(section);
      if (!isQuitting) {
        broadcastToAllWindows(mainWindow, 'open-sections-changed', getOpenSectionKeys());
      }
    });

    const htmlPath = path.join(__dirname, '..', '..', '..', 'index.html');
    await childWin.loadFile(htmlPath, {
      query: {
        standalone: section,
        tab: tabId || '',
        entityId: entityId ? String(entityId) : '',
        entityName: entityName ? String(entityName) : '',
        voucherNumber: voucherNumber ? String(voucherNumber) : ''
      }
    });

    return {
      success: true,
      alreadyOpen: false,
      openSections: getOpenSectionKeys()
    };
  });
}

module.exports = { registerWindowHandlers };
