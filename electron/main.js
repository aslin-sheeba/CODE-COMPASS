const { app, BrowserWindow } = require("electron")
const path = require("path")
require("./ipc/projectIPC")
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  })

  // Load Vite React app
  mainWindow.loadURL("http://localhost:5173")

  // Open DevTools only when the app is not packaged (development)
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