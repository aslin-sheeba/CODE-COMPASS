const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  selectProject: () => ipcRenderer.invoke("project:select"),
  onScanProgress: (cb) => ipcRenderer.on("project:scan-progress", (_event, progress) => cb(progress)),
  // legacy name used by UI: keep both for compatibility
  analyzeDeps: (projectPath) => ipcRenderer.invoke("deps:analyze", projectPath),
  jsanalyzeDeps: (projectPath) => ipcRenderer.invoke("deps:analyze", projectPath),
})