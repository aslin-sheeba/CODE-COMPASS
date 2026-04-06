const { contextBridge, ipcRenderer } = require("electron")

// Helper: registers a one-time-removable listener to prevent stacking (#5)
function makeListener(channel) {
  return (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.removeAllListeners(channel)   // clear any previous registration
    ipcRenderer.on(channel, handler)
  }
}

contextBridge.exposeInMainWorld("electronAPI", {
  // ── Project import ──────────────────────────────────────────────────────────
  selectProject:  () => ipcRenderer.invoke("project:select"),
  onScanProgress: makeListener("project:scan-progress"),

  // ── GitHub import ───────────────────────────────────────────────────────────
  getGitHubBranches: (opts) => ipcRenderer.invoke("github:get-branches", opts),
  cloneFromGitHub:   (opts) => ipcRenderer.invoke("github:clone", opts),
  onCloneProgress:   makeListener("github:clone-progress"),

  // ── File editing ────────────────────────────────────────────────────────────
  writeFileLine: (opts) => ipcRenderer.invoke("file:write", opts),

  // ── Git activity ────────────────────────────────────────────────────────────
  getGitData:    (projectPath)                => ipcRenderer.invoke("git:data", projectPath),
  getGitDiff:    (projectPath, commitHash)    => ipcRenderer.invoke("git:diff", { projectPath, commitHash }),
  getGitStatus:  (projectPath)                => ipcRenderer.invoke("git:status", projectPath),
  gitCommitPush: (projectPath, message, push) => ipcRenderer.invoke("git:commit-push", { projectPath, message, push }),
  openInVSCode:  (projectPath)                => ipcRenderer.invoke("git:open-vscode", projectPath),
})