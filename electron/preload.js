const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  selectProject: () => ipcRenderer.invoke("project:select"),
  onScanProgress: (cb) => ipcRenderer.on("project:scan-progress", (_event, progress) => cb(progress))
})