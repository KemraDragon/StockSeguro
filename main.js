const { app, BrowserWindow } = require('electron')
const path = require('path')

// Inicializar el módulo remote
require('@electron/remote/main').initialize()

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, 'assets', 'icon.ico'), // Icono correcto
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // Habilitar remote en la ventana
  require('@electron/remote/main').enable(win.webContents)

  // Cargar LOGIN como inicio
  win.loadFile('login.html')
}

// SOLO se llama cuando Electron está listo
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
