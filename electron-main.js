// electron-main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // Abilita funzionalità sperimentali per sfruttare meglio la GPU/NPU su Chromium
      webgl: true,
      webSecurity: false // Utile per caricare immagini locali se necessario
    }
  });

  // In sviluppo carica l'URL di Vite, in produzione carica il file index.html compilato
  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools(); // Scommenta per debug
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});