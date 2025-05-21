const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let backendProcess

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../frontend/dist/index.html'))
  }
}

app.whenReady().then(() => {
  backendProcess = spawn('python', ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000'], {
    cwd: path.join(__dirname, '../backend'),
    shell: true,
  })

  backendProcess.stdout.on('data', data => {
    console.log(`Backend: ${data}`)
  })
  backendProcess.stderr.on('data', data => {
    console.error(`Backend error: ${data}`)
  })

  createWindow()

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('quit', () => {
    if (backendProcess) backendProcess.kill()
  })
})
