const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let backendProcess;

function createWindow() {
  const forkArgs = [];
  const backendEnv = { ...process.env }; // Pass parent env by default

  if (app.isPackaged) {
    // When packaged, we set the PORT and pass the data path as an argument.
    backendEnv.PORT = 3001;
    const dataPath = path.join(app.getPath('userData'), 'graph_data');
    forkArgs.push(dataPath);
  }

  const backendPath = app.isPackaged
    ? path.join(__dirname, 'nodebook-base', 'server.js')
    : path.join(__dirname, '../nodebook-base/server.js');

  // Pass the data path argument to the backend process.
  backendProcess = fork(backendPath, forkArgs, {
    env: backendEnv,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
  });

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
      additionalArguments: [`--port=${port}`]
    }
  });

  if (app.isPackaged) {
    const indexPath = path.join(__dirname, 'nodebook-base', 'frontend', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
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