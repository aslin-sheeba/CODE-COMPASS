const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  // ── Project import ─────────────────────────────────────────────────────────
  selectProject: () => ipcRenderer.invoke("project:select"),
  onScanProgress: (cb) => ipcRenderer.on("project:scan-progress", (_e, p) => cb(p)),

  // ── GitHub import ──────────────────────────────────────────────────────────
  getGitHubBranches: (opts) => ipcRenderer.invoke("github:get-branches", opts),
  cloneFromGitHub: (opts) => ipcRenderer.invoke("github:clone", opts),
  onCloneProgress: (cb) => ipcRenderer.on("github:clone-progress", (_e, d) => cb(d)),

  // ── File editing (line-level editor) ──────────────────────────────────────
  writeFileLine: (opts) => ipcRenderer.invoke("file:write", opts),
})