const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let mainWindow;
let backendProcess;
let isBackendRunning = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../frontend/public/nodebook.png'),
    title: 'NodeBook',
    show: false, // Don't show until ready
  });

  // Load the app
  const indexPath = path.join(__dirname, '../frontend/dist/index.html');
  if (fs.existsSync(indexPath)) {
    mainWindow.loadFile(indexPath);
  } else {
    // Fallback to development server
    mainWindow.loadURL('http://localhost:3000');
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.send('app-ready');
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

function pingBackend(url, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      res.statusCode === 200 ? resolve(true) : reject(false);
    });
    req.on('error', () => reject(false));
    req.setTimeout(timeout, () => {
      req.abort();
      reject(false);
    });
  });
}

async function startBackend() {
  if (isBackendRunning) {
    return { success: true, message: 'Backend already running' };
  }

  try {
    const backendPath = path.join(__dirname, '../backend');
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    
    // Run post-install script first
    const postInstallProcess = spawn(pythonPath, ['scripts/post_install.py'], {
      cwd: backendPath,
      env: { ...process.env, PYTHONPATH: backendPath },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    postInstallProcess.stdout.on('data', data => {
      console.log(`[post-install]: ${data}`);
    });

    postInstallProcess.stderr.on('data', data => {
      console.error(`[post-install error]: ${data}`);
    });

    postInstallProcess.on('close', (code) => {
      console.log(`Post-install process exited with code ${code}`);
      
      // Start the backend after post-install completes
      backendProcess = spawn(pythonPath, ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000'], {
        cwd: backendPath,
        env: { ...process.env, PYTHONPATH: backendPath },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      backendProcess.stdout.on('data', data => {
        console.log(`[backend]: ${data}`);
      });

      backendProcess.stderr.on('data', data => {
        console.error(`[backend error]: ${data}`);
      });

      backendProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
        isBackendRunning = false;
        mainWindow?.webContents.send('backend-status-change', { running: false });
      });
    });

    // Wait for backend to start
    let attempts = 0;
    while (attempts < 30) {
      try {
        await pingBackend('http://localhost:8000/api/health');
        isBackendRunning = true;
        mainWindow?.webContents.send('backend-status-change', { running: true });
        return { success: true, message: 'Backend started successfully' };
      } catch (error) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error('Backend failed to start within 30 seconds');
  } catch (error) {
    console.error('Failed to start backend:', error);
    return { success: false, message: error.message };
  }
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
    isBackendRunning = false;
    mainWindow?.webContents.send('backend-status-change', { running: false });
  }
  return { success: true, message: 'Backend stopped' };
}

// IPC Handlers
ipcMain.handle('start-backend', async () => {
  return await startBackend();
});

ipcMain.handle('stop-backend', () => {
  return stopBackend();
});

ipcMain.handle('get-backend-status', () => {
  return { running: isBackendRunning };
});

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'YAML Files', extensions: ['yaml', 'yml'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

ipcMain.handle('dialog:saveFile', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'YAML Files', extensions: ['yaml', 'yml'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window:close', () => {
  mainWindow?.close();
});

ipcMain.on('window:open-dev-tools', () => {
  mainWindow?.webContents.openDevTools();
});

// App event handlers
app.whenReady().then(async () => {
  createWindow();
  
  // Start backend automatically
  await startBackend();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
});

// Handle external URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
