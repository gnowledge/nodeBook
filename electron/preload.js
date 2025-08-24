const { contextBridge } = require('electron');

// Find the port argument passed from the main process
const portArg = process.argv.find(arg => arg.startsWith('--port='));
const port = portArg ? portArg.split('=')[1] : null;

if (port) {
  // Expose the port and backend URL to the renderer process in a secure way
  contextBridge.exposeInMainWorld('electronAPI', {
    getBackendPort: () => port,
    getBackendURL: () => `http://localhost:${port}`,
    isElectron: true
  });
  
  // Also set a global variable that the frontend can access
  window.__ELECTRON_BACKEND_PORT__ = port;
  window.__ELECTRON_BACKEND_URL__ = `http://localhost:${port}`;
  window.__IS_ELECTRON__ = true;
} else {
  console.error('Preload script: Backend port argument not found.');
}