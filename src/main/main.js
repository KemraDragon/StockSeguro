const { initDb } = require('./dbInit');
const { app, BrowserWindow } = require('electron');
const path = require('path');
const remoteMain = require('@electron/remote/main');

remoteMain.initialize();

function createWindow () {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, '../renderer/assets/sTOCKsEGURO.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // preload: path.join(__dirname, '../preload/index.js'),
    }
  });

  // Si usas @electron/remote en el renderer
  try { remoteMain.enable(win.webContents); } catch (_) {}

  // Carga el login desde la nueva ubicación
  win.loadFile(path.join(__dirname, '../renderer/views/login.html'));
}

app.whenReady().then(() => {
  initDb();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
