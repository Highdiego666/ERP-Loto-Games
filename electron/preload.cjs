const { contextBridge, ipcRenderer } = require('electron');

function unwrap(result, fallback) {
  if (result?.ok) return result.data === undefined ? true : result.data;
  if (result && result.ok === false) throw new Error(result.error || 'Error IPC de Loto Games');
  return fallback;
}

contextBridge.exposeInMainWorld('lotoDesktop', {
  isDesktop: true,
  storage: {
    loadAll: () => unwrap(ipcRenderer.sendSync('storage:load-all-sync'), {}),
    setSync: (key, value) => unwrap(ipcRenderer.sendSync('storage:set-sync', key, value), false),
    removeSync: key => unwrap(ipcRenderer.sendSync('storage:remove-sync', key), false),
    clearSync: () => unwrap(ipcRenderer.sendSync('storage:clear-sync'), false),
    set: (key, value) => ipcRenderer.invoke('storage:set', key, value),
    remove: key => ipcRenderer.invoke('storage:remove', key),
    clear: () => ipcRenderer.invoke('storage:clear')
  },
  sync: {
    enqueueSync: job => unwrap(ipcRenderer.sendSync('sync:enqueue-sync', job), false),
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
