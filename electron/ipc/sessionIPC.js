// electron/ipc/sessionIPC.js
// Handles persistent session storage per project, branch-aware.
// Sessions are stored in: {userData}/sessions/{projectHash}.json

const { ipcMain, app } = require("electron")
const path  = require("path")
const fs    = require("fs")
const crypto = require("crypto")

function sessionsDir() {
  const base = app.getPath("userData")
  const dir  = path.join(base, "codecompass-sessions")
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

// Derive a stable key from project root path
function projectKey(projectRoot) {
  return crypto.createHash("md5").update(projectRoot || "unknown").digest("hex").slice(0, 12)
}

function sessionPath(projectRoot) {
  return path.join(sessionsDir(), `${projectKey(projectRoot)}.json`)
}

// ── IPC: session:save ─────────────────────────────────────────────────────────
ipcMain.handle("session:save", async (_event, { projectRoot, branch, data }) => {
  try {
    const sp   = sessionPath(projectRoot)
    let   file = {}
    if (fs.existsSync(sp)) {
      try { file = JSON.parse(fs.readFileSync(sp, "utf8")) } catch {}
    }

    // Keep up to 5 historical sessions per branch
    const branchKey = `branch_${(branch || "main").replace(/[^a-zA-Z0-9]/g, "_")}`
    if (!file.sessions) file.sessions = {}
    if (!file.sessions[branchKey]) file.sessions[branchKey] = []

    const entry = {
      ...data,
      savedAt: new Date().toISOString(),
      branch:  branch || "main",
    }

    // Prepend new entry, keep last 5
    file.sessions[branchKey] = [entry, ...file.sessions[branchKey]].slice(0, 5)
    file.lastBranch     = branch || "main"
    file.lastProjectRoot = projectRoot

    fs.writeFileSync(sp, JSON.stringify(file, null, 2), "utf8")
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

// ── IPC: session:load ─────────────────────────────────────────────────────────
ipcMain.handle("session:load", async (_event, { projectRoot, branch }) => {
  try {
    const sp = sessionPath(projectRoot)
    if (!fs.existsSync(sp)) return null

    const file      = JSON.parse(fs.readFileSync(sp, "utf8"))
    const branchKey = `branch_${(branch || "main").replace(/[^a-zA-Z0-9]/g, "_")}`
    const entries   = (file.sessions || {})[branchKey] || []
    return entries[0] || null   // most recent
  } catch {
    return null
  }
})

// ── IPC: session:list ─────────────────────────────────────────────────────────
// Returns last 5 sessions across all branches for this project
ipcMain.handle("session:list", async (_event, { projectRoot }) => {
  try {
    const sp = sessionPath(projectRoot)
    if (!fs.existsSync(sp)) return []

    const file     = JSON.parse(fs.readFileSync(sp, "utf8"))
    const sessions = file.sessions || {}
    const all      = []
    for (const branchKey of Object.keys(sessions)) {
      for (const entry of sessions[branchKey]) {
        all.push(entry)
      }
    }
    all.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    return all.slice(0, 5)
  } catch {
    return []
  }
})

// ── IPC: session:clear ────────────────────────────────────────────────────────
ipcMain.handle("session:clear", async (_event, { projectRoot }) => {
  try {
    const sp = sessionPath(projectRoot)
    if (fs.existsSync(sp)) fs.unlinkSync(sp)
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})
