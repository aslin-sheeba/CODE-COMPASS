// electron/main.js
const { app, BrowserWindow } = require("electron")
const path = require("path")

require("./ipc/projectIPC")
require("./ipc/sessionIPC")   // Phase 2: session persistence

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      enableRemoteModule: false,
      nodeIntegration: false
    }
  })
  
  // Set Content Security Policy (stricter in production)
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const cspPolicy = app.isPackaged
      ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:* https: ws: wss:; font-src 'self'; object-src 'none'; base-uri 'self';"
    
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspPolicy]
      }
    })
  })
  
  mainWindow.loadURL("http://localhost:5173")
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(() => {
  createWindow()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
