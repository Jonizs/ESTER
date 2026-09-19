const path = require('node:path');
const { app, BrowserWindow, Menu, ipcMain } = require('electron');

const isDev = process.env.ESTER_DEV === '1';

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    // The game opens full screen every launch. F11 is what leaves it - Esc is
    // the pause menu and must stay that, so it is deliberately not a way out
    // of full screen any more.
    fullscreen: true,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#04050a',
    title: 'ESTER',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // F11 fullscreen, F12 devtools. Esc belongs to the pause menu.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') win.setFullScreen(!win.isFullScreen());
    if (input.key === 'F12') win.webContents.toggleDevTools();
  });
}

// LEAVE GAME in the pause menu.
ipcMain.on('ester:quit', () => app.quit());

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
