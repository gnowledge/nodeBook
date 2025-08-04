const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // P2P Graph API
  p2p: {
    listNodes: () => ipcRenderer.invoke('p2p:listNodes'),
    listEdges: () => ipcRenderer.invoke('p2p:listEdges'),
    addNode: (id, label) => ipcRenderer.invoke('p2p:addNode', id, label),
    addEdge: (source, target, label) => ipcRenderer.invoke('p2p:addEdge', source, target, label),
    getKey: () => ipcRenderer.invoke('p2p:getKey'),
    listen: () => ipcRenderer.invoke('p2p:listen'),
    sync: (key) => ipcRenderer.invoke('p2p:sync', key)
  },

  // Backend management
  startBackend: () => ipcRenderer.invoke('start-backend'),
  stopBackend: () => ipcRenderer.invoke('stop-backend'),
  getBackendStatus: () => ipcRenderer.invoke('get-backend-status'),
  
  // File system operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: () => ipcRenderer.invoke('dialog:saveFile'),
  
  // App information
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Window management
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  
  // Development tools
  openDevTools: () => ipcRenderer.send('window:open-dev-tools'),
  
  // Event listeners
  onBackendStatusChange: (callback) => ipcRenderer.on('backend-status-change', callback),
  onAppReady: (callback) => ipcRenderer.on('app-ready', callback)
});

// Remove all listeners when the window is closed
window.addEventListener('beforeunload', () => {
  ipcRenderer.removeAllListeners();
}); 