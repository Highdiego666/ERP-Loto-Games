const { app, BrowserWindow } = require('electron');

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
let autoUpdater = null;
let initialized = false;
let backupBeforeInstall = null;
let timer = null;

let state = {
  status: 'idle',
  currentVersion: app.getVersion(),
  availableVersion: null,
  percent: 0,
  message: 'Actualizaciones listas para inicializar',
  error: null,
  checkedAt: null
};

function getUpdateState() {
  return { ...state };
}

function broadcast() {
  const payload = getUpdateState();
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('update:status', payload);
  }
}

function setState(patch) {
  state = { ...state, ...patch };
  broadcast();
  return getUpdateState();
}

function supported() {
  return app.isPackaged && process.platform === 'win32';
}

function loadUpdater() {
  if (!supported()) return null;
  if (!autoUpdater) {
    ({ autoUpdater } = require('electron-updater'));
  }
  return autoUpdater;
}

async function checkForUpdates() {
  if (!supported()) {
    return setState({
      status: 'disabled',
      currentVersion: app.getVersion(),
      message: 'Actualizador activo solamente en la app instalada de Windows',
      error: null
    });
  }

  const updater = loadUpdater();
  try {
    setState({ status: 'checking', message: 'Buscando actualización…', error: null });
    await updater.checkForUpdates();
  } catch (error) {
    setState({
      status: 'error',
      message: 'No se pudo comprobar actualizaciones; la app seguirá funcionando normalmente',
      error: error?.message || String(error),
      checkedAt: new Date().toISOString()
    });
  }
  return getUpdateState();
}

async function installUpdate() {
  if (!supported()) return false;
  if (state.status !== 'downloaded') {
    throw new Error('No hay una actualización descargada lista para instalar');
  }

  if (typeof backupBeforeInstall === 'function') {
    await backupBeforeInstall(state.availableVersion || 'desconocida');
  }

  setState({ status: 'installing', message: 'Instalando actualización…', error: null });
  loadUpdater().quitAndInstall(false, true);
  return true;
}

function setupUpdater(options = {}) {
  if (initialized) return getUpdateState();
  initialized = true;
  backupBeforeInstall = options.backupBeforeInstall || null;

  if (!supported()) {
    setState({
      status: 'disabled',
      currentVersion: app.getVersion(),
      message: 'Modo desarrollo: actualizador de Windows desactivado',
      error: null
    });
    return getUpdateState();
  }

  const updater = loadUpdater();
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.allowPrerelease = false;
  updater.logger = console;

  updater.on('checking-for-update', () => {
    setState({ status: 'checking', message: 'Buscando actualización…', error: null });
  });

  updater.on('update-available', info => {
    setState({
      status: 'available',
      availableVersion: info?.version || null,
      percent: 0,
      message: `Nueva versión ${info?.version || ''} disponible; descargando…`,
      error: null,
      checkedAt: new Date().toISOString()
    });
  });

  updater.on('update-not-available', info => {
    setState({
      status: 'current',
      currentVersion: app.getVersion(),
      availableVersion: info?.version || null,
      percent: 100,
      message: `Loto Games ${app.getVersion()} está actualizado`,
      error: null,
      checkedAt: new Date().toISOString()
    });
  });

  updater.on('download-progress', progress => {
    const percent = Math.max(0, Math.min(100, Number(progress?.percent || 0)));
    setState({
      status: 'downloading',
      percent,
      message: `Descargando actualización… ${percent.toFixed(0)}%`,
      error: null
    });
  });

  updater.on('update-downloaded', async info => {
    try {
      if (typeof backupBeforeInstall === 'function') {
        await backupBeforeInstall(info?.version || 'desconocida');
      }
      setState({
        status: 'downloaded',
        availableVersion: info?.version || null,
        percent: 100,
        message: `Versión ${info?.version || ''} lista. Se instalará al cerrar Loto Games.`,
        error: null,
        checkedAt: new Date().toISOString()
      });
    } catch (error) {
      setState({
        status: 'error',
        message: 'La actualización se descargó, pero falló el respaldo previo',
        error: error?.message || String(error)
      });
    }
  });

  updater.on('error', error => {
    setState({
      status: 'error',
      message: 'Actualización pendiente; se volverá a intentar cuando haya conexión',
      error: error?.message || String(error),
      checkedAt: new Date().toISOString()
    });
  });

  setTimeout(() => checkForUpdates(), 20000);
  timer = setInterval(() => checkForUpdates(), CHECK_INTERVAL_MS);

  return getUpdateState();
}

function stopUpdater() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = {
  setupUpdater,
  stopUpdater,
  checkForUpdates,
  installUpdate,
  getUpdateState
};
