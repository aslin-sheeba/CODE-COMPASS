const { ipcMain, dialog, BrowserWindow } = require("electron")
const path = require("path")
const { fork } = require("child_process")
const os = require("os")
const fs = require("fs")
const simpleGit = require("simple-git")

// ─── HELPER: send clone progress to renderer ─────────────────────────────────
function sendProgress(win, message, phase) {
  if (win && win.webContents) {
    win.webContents.send("github:clone-progress", { message, phase })
  }
}

// ─── HELPER: run scanner worker on a folder ──────────────────────────────────
function runScanner(folderPath, win) {
  return new Promise((resolve) => {
    const workerPath = path.join(__dirname, "..", "scannerWorker.js")
    const child = fork(workerPath)

    child.on("message", (msg) => {
      if (!msg || !msg.type) return
      if (msg.type === "progress") {
        if (win && win.webContents)
          win.webContents.send("project:scan-progress", msg.progress)
      } else if (msg.type === "result") {
        resolve(msg.files)
      } else if (msg.type === "error") {
        console.error("Worker error:", msg.error)
        resolve(null)
      }
    })

    child.on("exit", () => resolve(null))
    child.send({ type: "scan", folder: folderPath })
  })
}

// ─── IPC: project:select ──────────────────────────────────────────────────────
ipcMain.handle("project:select", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] })
  if (result.canceled) return null

  try {
    const win = BrowserWindow.getAllWindows()[0]
    return await runScanner(result.filePaths[0], win)
  } catch (err) {
    console.error("Failed to start scanner worker:", err)
    return null
  }
})

// ─── IPC: github:get-branches ─────────────────────────────────────────────────
ipcMain.handle("github:get-branches", async (_event, { repoUrl, token }) => {
  try {
    let owner, repo
    const shorthand = repoUrl.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/)
    const urlMatch = repoUrl.match(/github\.com[/:]+([^/]+)\/([^/\s.]+?)(?:\.git)?$/)

    if (shorthand) { owner = shorthand[1]; repo = shorthand[2] }
    else if (urlMatch) { owner = urlMatch[1]; repo = urlMatch[2] }
    else return { error: "Invalid GitHub URL. Use 'owner/repo' or a full GitHub URL." }

    const headers = { "User-Agent": "CodeCompass" }
    if (token) headers["Authorization"] = `token ${token}`

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, { headers })

    if (res.status === 404) return { error: "Repository not found. Check the URL." }
    if (res.status === 401) return { error: "Authentication failed. Check your PAT." }
    if (!res.ok) return { error: `GitHub API error: ${res.status}` }

    const data = await res.json()
    return { branches: data.map(b => b.name), owner, repo }
  } catch (err) {
    return { error: `Network error: ${err.message}` }
  }
})

// ─── IPC: github:clone ────────────────────────────────────────────────────────
ipcMain.handle("github:clone", async (_event, { repoUrl, branch, token }) => {
  const win = BrowserWindow.getAllWindows()[0]

  try {
    let cloneUrl = repoUrl
    const shorthand = repoUrl.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/)
    if (shorthand) cloneUrl = `https://github.com/${shorthand[1]}/${shorthand[2]}.git`
    if (token) cloneUrl = cloneUrl.replace("https://", `https://${token}@`)

    const repoName = cloneUrl.match(/([^/]+?)(?:\.git)?$/)?.[1] || "repo"
    const cloneDir = path.join(os.tmpdir(), `codecompass-${repoName}-${Date.now()}`)
    fs.mkdirSync(cloneDir, { recursive: true })

    sendProgress(win, `Cloning ${repoName}...`, "cloning")

    await simpleGit().clone(cloneUrl, cloneDir, ["--branch", branch, "--depth", "1"])

    sendProgress(win, "Scanning project files...", "scanning")

    const files = await runScanner(cloneDir, win)
    if (!files) return { error: "Failed to scan the cloned repository." }

    sendProgress(win, "Done!", "done")
    return { files, cloneDir }

  } catch (err) {
    const msg = err.message || String(err)
    if (msg.includes("not found")) return { error: "Repository not found. Check the URL and token." }
    if (msg.includes("auth") || msg.includes("403")) return { error: "Authentication failed. Check your PAT." }
    if (msg.includes("ENOTFOUND")) return { error: "Network error. Check your internet connection." }
    return { error: `Clone failed: ${msg}` }
  }
})

// ─── IPC: file:write ──────────────────────────────────────────────────────────
// Writes updated full file content back to disk (used by line editor)
ipcMain.handle("file:write", async (_event, { filePath, newContent }) => {
  try {
    // Safety: only allow writing to files that exist (no new file creation)
    if (!fs.existsSync(filePath)) {
      return { error: `File not found: ${filePath}` }
    }
    await fs.promises.writeFile(filePath, newContent, "utf8")
    return { success: true }
  } catch (err) {
    return { error: `Write failed: ${err.message}` }
  }
})