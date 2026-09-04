'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function eventSubscription(channel, callback) {
  if (typeof callback !== 'function') return () => {};
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api = Object.freeze({
  isDesktop: true,
  getAppInfo: () => ipcRenderer.invoke('loto:app-info'),
  db: Object.freeze({
    newId: () => ipcRenderer.invoke('loto:db-new-id'),
    list: entity => ipcRenderer.invoke('loto:db-list', entity),
    get: (entity, id) => ipcRenderer.invoke('loto:db-get', entity, id),
    insert: (entity, payload) => ipcRenderer.invoke('loto:db-insert', entity, payload),
    update: (entity, id, patch) => ipcRenderer.invoke('loto:db-update', entity, id, patch),
    remove: (entity, id) => ipcRenderer.invoke('loto:db-delete', entity, id),
    batch: operations => ipcRenderer.invoke('loto:db-batch', operations),
    importLegacy: tables => ipcRenderer.invoke('loto:db-import-legacy', tables)
  }),
  getSyncStatus: () => ipcRenderer.invoke('loto:sync-status'),
  syncNow: () => ipcRenderer.invoke('loto:sync-now'),
  backupNow: () => ipcRenderer.invoke('loto:backup-now'),
  onSyncStatus: callback => eventSubscription('loto:sync-status', callback),
  checkForUpdates: () => ipcRenderer.invoke('loto:update-check'),
  installUpdate: () => ipcRenderer.invoke('loto:update-install'),
  onUpdateStatus: callback => eventSubscription('loto:update-status', callback)
});

contextBridge.exposeInMainWorld('lotoDesktop', api);
