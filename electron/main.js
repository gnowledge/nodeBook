const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { HyperGraph } = require('./hyper-graph.js');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Initialize electron-store
const store = new Store();

// Global reference to the graph instance
let graph;

// Configure logging
log.transports.file.level = 'info';
log.info('App starting...');

// Configure auto-updater
autoUpdater.logger = log;
try {
  autoUpdater.checkForUpdatesAndNotify();
} catch (error) {
  log.error('Error in auto-updater. ' + error);
}


function getDefaultDataPath() {
  return path.join(app.getPath('userData'), 'hyper-db');
}

async function initializeP2PEngine() {
  const customDataPath = store.get('dataPath');
  const dbPath = customDataPath || getDefaultDataPath();

  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  console.log(`Initializing P2P database at: ${dbPath}`);
  graph = await HyperGraph.create(dbPath);
  console.log('P2P Engine Initialized. Graph key:', graph.key);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../frontend/public/nodebook.png'),
    title: 'NodeBook',
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    const indexPath = path.join(process.resourcesPath, 'frontend', 'dist', 'index.html');
    win.loadFile(indexPath);
  }

  win.once('ready-to-show', () => {
    win.show();
  });
}

app.whenReady().then(async () => {
  await initializeP2PEngine();
  createWindow();
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers for Settings ---

ipcMain.handle('settings:get-data-path', () => {
  return store.get('dataPath') || getDefaultDataPath();
});

ipcMain.handle('settings:set-data-path', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (canceled || filePaths.length === 0) {
    return;
  }
  const newPath = filePaths[0];
  store.set('dataPath', newPath);
  return newPath;
});

ipcMain.handle('app:relaunch', () => {
  app.relaunch();
  app.quit();
});


// --- IPC Handlers for P2P Graph Engine ---

ipcMain.handle('p2p:listNodes', async () => {
  if (!graph) return [];
  return await graph.listNodes();
});

ipcMain.handle('p2p:listEdges', async () => {
  if (!graph) return [];
  return await graph.listEdges();
});

ipcMain.handle('p2p:addNode', async (event, id, label) => {
  if (!graph) return;
  await graph.addNode(id, label);
});

ipcMain.handle('p2p:addEdge', async (event, source, target, label) => {
  if (!graph) return;
  await graph.addEdge(source, target, label);
});

ipcMain.handle('p2p:getKey', () => {
  if (!graph) return null;
  return graph.key;
});

ipcMain.handle('p2p:listen', async () => {
  if (!graph) return;
  // Note: In a real app, you'd want to send status updates back to the renderer.
  await graph.joinSwarm();
});

// This is a simplified sync handler for the demo.
// A real implementation would need to handle remote core storage properly.
ipcMain.handle('p2p:sync', async (event, key) => {
  if (!graph || !key) return;
  console.log(`Syncing with key: ${key}`);
  const userDataPath = app.getPath('userData');
  const remoteDbPath = path.join(userDataPath, `remote-${key.slice(0, 6)}`);
  const remoteCore = new Hypercore(remoteDbPath, key);
  await graph.core.session.replicate(remoteCore);
  console.log('Replication session started.');
});

// --- Auto-update Event Handlers ---

autoUpdater.on('update-available', () => {
  log.info('update_available');
  // Optionally, send a message to the renderer process to notify the user.
});

autoUpdater.on('update-downloaded', () => {
  log.info('update_downloaded');
  // Optionally, send a message to the renderer process to prompt the user to restart.
  autoUpdater.quitAndInstall();
});

autoUpdater.on('error', (err) => {
  log.error('Error in auto-updater. ' + err);
});