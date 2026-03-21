const { ipcMain, dialog, BrowserWindow } = require("electron")
const path = require("path")
const { fork } = require("child_process")

ipcMain.handle("project:select", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"]
  })

  if (result.canceled) return null

  const folderPath = result.filePaths[0]

  try {
    const win = BrowserWindow.getAllWindows()[0]

    const workerPath = path.join(__dirname, "..", "scannerWorker.js")
    const child = fork(workerPath)

    return await new Promise((resolve) => {
      child.on("message", (msg) => {
        if (!msg || !msg.type) return
        if (msg.type === "progress") {
          if (win && win.webContents) win.webContents.send("project:scan-progress", msg.progress)
        } else if (msg.type === "result") {
          resolve(msg.files)
        } else if (msg.type === "error") {
          console.error("Worker error:", msg.error)
          resolve(null)
        }
      })

      child.on("exit", (code) => {
        // If child exits without sending result, resolve null
        resolve(null)
      })

      child.send({ type: "scan", folder: folderPath })
    })
  } catch (err) {
    console.error("Failed to start scanner worker:", err)
    return null
  }
})