// electron/ipc/gitIPC.js
// Registers all git-related IPC handlers for the Electron main process.
// Wires: git:data, git:status, git:diff, git:commit-push, git:open-vscode

const { ipcMain, shell } = require("electron")
const path               = require("path")
const { exec }           = require("child_process")

const {
  getGitData,
  getGitStatus,
  getGitDiff,
  gitCommitPush,
} = require(path.join(__dirname, "../../codecompass/server/git/gitService"))

// ── git:data ─────────────────────────────────────────────────────────────────
// Returns full git history payload: stats, commits, contributors, churnFiles, heatmap
ipcMain.handle("git:data", async (_event, projectPath) => {
  if (!projectPath) return null
  try {
    return await getGitData(projectPath)
  } catch (err) {
    console.error("[git:data] error:", err.message)
    return null
  }
})

// ── git:status ───────────────────────────────────────────────────────────────
// Returns working-tree status: modified, added, deleted, untracked, branch
ipcMain.handle("git:status", async (_event, projectPath) => {
  if (!projectPath) return { error: "No project path provided" }
  try {
    return await getGitStatus(projectPath)
  } catch (err) {
    console.error("[git:status] error:", err.message)
    return { error: err.message }
  }
})

// ── git:diff ─────────────────────────────────────────────────────────────────
// Returns the unified diff for a given commit hash
ipcMain.handle("git:diff", async (_event, { projectPath, commitHash }) => {
  if (!projectPath || !commitHash) return { error: "Missing projectPath or commitHash" }
  try {
    return await getGitDiff(projectPath, commitHash)
  } catch (err) {
    console.error("[git:diff] error:", err.message)
    return { error: err.message }
  }
})

// ── git:commit-push ───────────────────────────────────────────────────────────
// Stages all changes, commits with the given message, and optionally pushes
ipcMain.handle("git:commit-push", async (_event, { projectPath, message, push }) => {
  if (!projectPath) return { error: "No project path provided" }
  if (!message?.trim()) return { error: "Commit message cannot be empty" }
  try {
    return await gitCommitPush(projectPath, message.trim(), push !== false)
  } catch (err) {
    console.error("[git:commit-push] error:", err.message)
    return { error: err.message }
  }
})

// ── git:open-vscode ───────────────────────────────────────────────────────────
// Opens the project folder in VS Code using `code` CLI
ipcMain.handle("git:open-vscode", async (_event, projectPath) => {
  if (!projectPath) return { error: "No project path provided" }
  return new Promise((resolve) => {
    exec(`code "${projectPath}"`, (err) => {
      if (err) {
        // Fallback: try to open as a folder in the default file manager
        shell.openPath(projectPath).then(() => resolve({ success: true })).catch(e => resolve({ error: e.message }))
      } else {
        resolve({ success: true })
      }
    })
  })
})

console.log("[gitIPC] git IPC handlers registered: git:data, git:status, git:diff, git:commit-push, git:open-vscode")