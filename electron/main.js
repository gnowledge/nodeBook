const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

let backendProcess;
let tempNodebookPath = null;

async function extractNodebookBase() {
  if (tempNodebookPath) return tempNodebookPath;
  
  const tempDir = path.join(app.getPath('temp'), 'nodebook-base-' + Date.now());
  const sourcePath = path.join(__dirname, 'nodebook-base');
  
  try {
    // Copy nodebook-base to temp directory, but skip node_modules if it doesn't exist
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    // Check if node_modules exists in source
    const nodeModulesExists = await fs.promises.access(path.join(sourcePath, 'node_modules')).then(() => true).catch(() => false);
    
    if (nodeModulesExists) {
      await copyDirectory(sourcePath, tempDir);
    } else {
      // Copy everything except node_modules
      await copyDirectoryWithoutNodeModules(sourcePath, tempDir);
      console.log('⚠️ [ELECTRON] node_modules not found, skipping...');
    }
    
    tempNodebookPath = tempDir;
    console.log('📦 [ELECTRON] Extracted nodebook-base to:', tempNodebookPath);
    return tempNodebookPath;
  } catch (error) {
    console.error('❌ [ELECTRON] Failed to extract nodebook-base:', error);
    throw error;
  }
}

async function copyDirectory(src, dest) {
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await fs.promises.mkdir(destPath, { recursive: true });
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

async function copyDirectoryWithoutNodeModules(src, dest) {
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Skip node_modules directory
    if (entry.name === 'node_modules') {
      console.log('⏭️ [ELECTRON] Skipping node_modules directory');
      continue;
    }
    
    if (entry.isDirectory()) {
      await fs.promises.mkdir(destPath, { recursive: true });
      await copyDirectoryWithoutNodeModules(srcPath, destPath);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

async function createWindow() {
  const forkArgs = [];
  const backendEnv = { 
    ...process.env,
    NODE_ENV: 'desktop' // Set desktop environment for auto-login
  };

  let nodebookBasePath;
  
  if (app.isPackaged) {
    // When packaged, extract nodebook-base to temp directory
    nodebookBasePath = await extractNodebookBase();
    
    // Set the PORT and pass the data path as an argument.
    backendEnv.PORT = 3001;
    const dataPath = path.join(app.getPath('userData'), 'graph_data');
    forkArgs.push(dataPath);
    
    // Set working directory and NODE_PATH for the forked process
    // Check if node_modules exists before setting NODE_PATH
    const nodeModulesPath = path.join(nodebookBasePath, 'node_modules');
    const nodeModulesExists = await fs.promises.access(nodeModulesPath).then(() => true).catch(() => false);
    
    if (nodeModulesExists) {
      backendEnv.NODE_PATH = nodeModulesPath;
      backendEnv.NODE_MODULES_PATH = nodeModulesPath;
    } else {
      console.log('⚠️ [ELECTRON] node_modules not found, NODE_PATH not set');
    }
    
    backendEnv.PWD = nodebookBasePath;
    backendEnv.cwd = nodebookBasePath;
  } else {
    // In development mode, set the working directory to nodebook-base and use port 3001
    nodebookBasePath = path.join(__dirname, '../nodebook-base');
    backendEnv.PORT = 3001; // Use different port to avoid Docker conflicts
    backendEnv.PWD = nodebookBasePath;
    backendEnv.cwd = nodebookBasePath;
  }

  const backendPath = app.isPackaged
    ? path.join(nodebookBasePath, 'server.js')
    : path.join(__dirname, '../nodebook-base/server.js');

  const forkOptions = {
    env: backendEnv,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    cwd: nodebookBasePath
  };
  
  // Debug logging
  console.log('🔍 [ELECTRON DEBUG] App packaged:', app.isPackaged);
  console.log('🔍 [ELECTRON DEBUG] Backend path:', backendPath);
  console.log('🔍 [ELECTRON DEBUG] Working directory (cwd):', forkOptions.cwd);
  console.log('🔍 [ELECTRON DEBUG] Environment PWD:', backendEnv.PWD);
  console.log('🔍 [ELECTRON DEBUG] Environment cwd:', backendEnv.cwd);
  
  backendProcess = fork(backendPath, forkArgs, forkOptions);
  
  if (backendProcess.stdout) {
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Backend STDOUT:', output);

      const match = output.match(/Backend server is running on http:\/\/localhost:(\d+)/);
      if (match) {
        const port = match[1];
        console.log(`Backend started on port: ${port}`);
        createBrowserWindow(port);
      }
    });
  }

  if (backendProcess.stderr) {
    backendProcess.stderr.on('data', (data) => {
      console.error('Backend STDERR:', data.toString());
    });
  }

  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend process.', err);
  });
}

function createBrowserWindow(port) {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Use a preload script to securely expose the port to the renderer
      preload: path.join(__dirname, 'preload.js'),
      // Pass the port to the preload script
      additionalArguments: [`--port=${port}`],
      nodeIntegration: false,
      contextIsolation: true
    },
    title: 'NodeBook - Desktop Edition',
    icon: path.join(__dirname, 'assets', 'icon.png') // Add icon if available
  });

  if (app.isPackaged) {
    const indexPath = path.join(__dirname, 'nodebook-base', 'frontend', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    // Clean up backend process when window is closed
    if (backendProcess) {
      console.log('Killing backend process...');
      backendProcess.kill();
    }
  });
}

app.whenReady().then(() => createWindow().catch(console.error));

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow().catch(console.error);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (backendProcess) {
    console.log('Killing backend process...');
    backendProcess.kill();
  }
});

// Handle app quit
app.on('before-quit', () => {
  if (backendProcess) {
    console.log('Gracefully shutting down backend...');
    backendProcess.kill('SIGTERM');
    
    // Give the backend a moment to clean up
    setTimeout(() => {
      if (backendProcess) {
        backendProcess.kill('SIGKILL');
      }
    }, 2000);
  }
});
