// electron-main.js
const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const DIST_DIR = path.join(__dirname, 'dist');

/**
 * L'app viene servita su uno schema custom `app://` invece che da `file://`.
 *
 * Motivo: la rimozione sfondo carica il modello ONNX e il runtime WASM con
 * `fetch()`, e Chromium blocca `fetch()` su `file://`. Con uno schema
 * registrato come standard e sicuro tutto funziona come sul web, senza dover
 * disattivare le protezioni del browser.
 */
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true, // necessario per le richieste Range sul modello da 44 MB
      corsEnabled: true,
    },
  },
]);

function registerAppProtocol() {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    const decoded = decodeURIComponent(pathname);
    // Una richiesta a "/" deve servire la pagina, non una cartella.
    const relative = decoded === '/' || decoded.endsWith('/')
      ? path.join(decoded, 'index.html')
      : decoded;

    // Normalizza e blocca i tentativi di uscire dalla cartella dist.
    const resolved = path.normalize(path.join(DIST_DIR, relative));
    const target = resolved.startsWith(DIST_DIR)
      ? resolved
      : path.join(DIST_DIR, 'index.html');

    return net.fetch(pathToFileURL(target).toString());
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 380,
    minHeight: 500,
    backgroundColor: '#f8fafc',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webgl: true,
    },
  });

  // ELECTRON_FORCE_PROD permette di provare il caricamento da `app://`
  // (quello usato nell'app installata) senza dover impacchettare ogni volta.
  const isDev = !app.isPackaged && process.env.ELECTRON_FORCE_PROD !== '1';
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadURL('app://caa-facile/index.html');
  }
}

app.whenReady().then(() => {
  registerAppProtocol();
  createWindow();
});

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
