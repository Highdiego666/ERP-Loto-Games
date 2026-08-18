const { contextBridge, ipcRenderer } = require('electron');

const api = Object.freeze({
  isDesktop: true,
  getAppInfo: () => ipcRenderer.invoke('loto:app-info'),
  readLocalCache: () => ipcRenderer.invoke('loto:cache-read'),
  writeLocalCache: payload => ipcRenderer.invoke('loto:cache-write', payload),
  checkForUpdates: () => ipcRenderer.invoke('loto:update-check'),
  installUpdate: () => ipcRenderer.invoke('loto:update-install'),
  onUpdateStatus: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('loto:update-status', listener);
    return () => ipcRenderer.removeListener('loto:update-status', listener);
  }
});

contextBridge.exposeInMainWorld('lotoDesktop', api);
