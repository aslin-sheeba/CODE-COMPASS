'use strict'

const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {

  // ─── Project ────────────────────────────────────────────────────────────────
  selectProject: () =>
    ipcRenderer.invoke("project:select"),

  onScanProgress: (cb) =>
    ipcRenderer.on("project:scan-progress", (_event, progress) => cb(progress)),

  // ─── GitHub ─────────────────────────────────────────────────────────────────
  getBranches: (repoUrl, token) =>
    ipcRenderer.invoke("github:get-branches", { repoUrl, token }),

  cloneRepo: (repoUrl, branch, token) =>
    ipcRenderer.invoke("github:clone", { repoUrl, branch, token }),

  onCloneProgress: (cb) =>
    ipcRenderer.on("github:clone-progress", (_event, data) => cb(data)),

  // ─── File ───────────────────────────────────────────────────────────────────
  writeFile: (filePath, newContent) =>
    ipcRenderer.invoke("file:write", { filePath, newContent }),

  // ─── Git ────────────────────────────────────────────────────────────────────
  getGitData: (projectPath) =>
    ipcRenderer.invoke("git:data", projectPath),

  getGitDiff: (projectPath, commitHash) =>
    ipcRenderer.invoke("git:diff", { projectPath, commitHash }),

  getGitStatus: (projectPath) =>
    ipcRenderer.invoke("git:status", projectPath),

  commitAndPush: (projectPath, message, push) =>
    ipcRenderer.invoke("git:commit-push", { projectPath, message, push }),

  openInVSCode: (projectPath) =>
    ipcRenderer.invoke("git:open-vscode", projectPath),

  // ─── Cleanup: remove listeners to avoid memory leaks ───────────────────────
  removeAllListeners: (channel) =>
    ipcRenderer.removeAllListeners(channel),
})