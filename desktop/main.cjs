const { app, BrowserWindow, Menu, nativeImage, session, shell, Tray } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let serverProcess;
let mainWindow;
let tray;
let isQuitting = false;

function startServer() {
  const serverPath = path.join(__dirname, '..', 'dist', 'server.cjs');
  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: path.join(__dirname, '..'),
    windowsHide: true,
    stdio: 'ignore',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch('http://localhost:3000/api/health');
      if (response.ok) return;
    } catch {
      // The compiled server may need a moment to start.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Il server locale di 3 athlas non risponde sulla porta 3000.');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    show: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  mainWindow.loadURL('http://localhost:3000');
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
  );
  tray = new Tray(icon);
  tray.setToolTip('3 athlas');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Apri 3 athlas', click: () => mainWindow.show() },
    { label: 'Esci', click: () => { isQuitting = true; app.quit(); } },
  ]));
  tray.on('double-click', () => mainWindow.show());
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media');
  });
  session.defaultSession.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  startServer();
  await waitForServer();
  createWindow();
  createTray();
}).catch((error) => {
  console.error('[3 athlas] Avvio desktop fallito:', error);
  app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  if (serverProcess) serverProcess.kill();
});

app.on('window-all-closed', (event) => event.preventDefault());
