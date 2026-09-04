const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lotoDesktop', {
  isDesktop: true,
  storage: {
    loadAll: () => ipcRenderer.sendSync('storage:load-all-sync'),
    set: (key, value) => ipcRenderer.invoke('storage:set', key, value),
    remove: key => ipcRenderer.invoke('storage:remove', key),
    clear: () => ipcRenderer.invoke('storage:clear')
  },
  sync: {
    enqueue: job => ipcRenderer.invoke('sync:enqueue', job),
    pending: limit => ipcRenderer.invoke('sync:pending', limit),
    complete: id => ipcRenderer.invoke('sync:complete', id),
    fail: (id, message) => ipcRenderer.invoke('sync:fail', id, message)
  },
  backup: {
    create: () => ipcRenderer.invoke('backup:create')
  },
  app: {
    paths: () => ipcRenderer.invoke('app:paths')
  }
});
