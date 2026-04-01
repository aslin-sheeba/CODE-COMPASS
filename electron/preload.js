const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  // ── Project import ─────────────────────────────────────────────────────────
  selectProject:  () => ipcRenderer.invoke("project:select"),
  onScanProgress: (cb) => ipcRenderer.on("project:scan-progress", (_e, p) => cb(p)),

  // ── GitHub import ──────────────────────────────────────────────────────────
  getGitHubBranches: (opts) => ipcRenderer.invoke("github:get-branches", opts),
  cloneFromGitHub:   (opts) => ipcRenderer.invoke("github:clone", opts),
  onCloneProgress:   (cb)  => ipcRenderer.on("github:clone-progress", (_e, d) => cb(d)),

  // ── File editing (line-level editor) ──────────────────────────────────────
  writeFileLine: (opts) => ipcRenderer.invoke("file:write", opts),

  // ── Git activity ──────────────────────────────────────────────────────────
  getGitData:    (projectPath)                    => ipcRenderer.invoke("git:data", projectPath),
  getGitDiff:    (projectPath, commitHash)        => ipcRenderer.invoke("git:diff", { projectPath, commitHash }),
  getGitStatus:  (projectPath)                    => ipcRenderer.invoke("git:status", projectPath),
  gitCommitPush: (projectPath, message, push)     => ipcRenderer.invoke("git:commit-push", { projectPath, message, push }),
  openInVSCode:  (projectPath)                    => ipcRenderer.invoke("git:open-vscode", projectPath),
})