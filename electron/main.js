const { app, BrowserWindow } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const http = require('http');

let backendProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('dist/index.html');
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

function startBackendIfNeeded() {
  pingBackend('http://localhost:8000/health')
    .then(() => {
      console.log("✅ Backend already running.");
    })
    .catch(() => {
      console.log("🚀 Starting backend...");
      backendProcess = exec('uvicorn main:app --reload --port 8000', {
        cwd: path.join(__dirname, '../backend'), // Adjust if needed
        env: process.env,
      });

      backendProcess.stdout.on('data', data => console.log(`[backend]: ${data}`));
      backendProcess.stderr.on('data', data => console.error(`[backend error]: ${data}`));
    });
}

app.whenReady().then(() => {
  startBackendIfNeeded();
  createWindow();
});

app.on('will-quit', () => {
  if (backendProcess) backendProcess.kill();
});
