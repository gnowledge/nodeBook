const { contextBridge } = require('electron');

// Find the port argument passed from the main process
const portArg = process.argv.find(arg => arg.startsWith('--port='));
const port = portArg ? portArg.split('=')[1] : null;

if (port) {
  // Expose the port to the renderer process in a secure way
  contextBridge.exposeInMainWorld('electronAPI', {
    getBackendPort: () => port
  });
} else {
  console.error('Preload script: Backend port argument not found.');
}