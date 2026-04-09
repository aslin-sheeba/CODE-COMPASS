const { ipcMain, dialog, BrowserWindow, shell } = require("electron")
const path = require("path")
const { fork, spawn } = require("child_process")
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

// ─── HELPER: find git root from any file path ────────────────────────────────
function findGitRoot(startPath) {
  let current = startPath
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, ".git"))) return current
    current = path.dirname(current)
  }
  return null
}

// ─── REGISTER: all project + git IPC handlers ────────────────────────────────
function registerProjectIPC() {

  // ─── IPC: project:select ───────────────────────────────────────────────────
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

  // ─── IPC: github:get-branches ──────────────────────────────────────────────
  ipcMain.handle("github:get-branches", async (_event, { repoUrl, token }) => {
    try {
      let owner, repo
      const shorthand = repoUrl.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/)
      const urlMatch  = repoUrl.match(/github\.com[/:]+([^/]+)\/([^/\s.]+?)(?:\.git)?$/)
      if (shorthand)     { owner = shorthand[1]; repo = shorthand[2] }
      else if (urlMatch) { owner = urlMatch[1];  repo = urlMatch[2]  }
      else return { error: "Invalid GitHub URL." }

      const headers = { "User-Agent": "CodeCompass" }
      if (token) headers["Authorization"] = `token ${token}`

      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/branches`,
        { headers }
      )
      if (res.status === 404) return { error: "Repository not found." }
      if (res.status === 401) return { error: "Authentication failed." }
      if (!res.ok)            return { error: `GitHub API error: ${res.status}` }

      const data = await res.json()
      return { branches: data.map(b => b.name), owner, repo }
    } catch (err) {
      return { error: `Network error: ${err.message}` }
    }
  })

  // ─── IPC: github:clone ─────────────────────────────────────────────────────
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
      if (msg.includes("not found"))                  return { error: "Repository not found." }
      if (msg.includes("auth") || msg.includes("403")) return { error: "Authentication failed." }
      if (msg.includes("ENOTFOUND"))                  return { error: "Network error." }
      return { error: `Clone failed: ${msg}` }
    }
  })

  // ─── IPC: file:write ───────────────────────────────────────────────────────
  ipcMain.handle("file:write", async (_event, { filePath, newContent }) => {
    try {
      if (!fs.existsSync(filePath)) return { error: `File not found: ${filePath}` }
      await fs.promises.writeFile(filePath, newContent, "utf8")
      return { success: true }
    } catch (err) {
      return { error: `Write failed: ${err.message}` }
    }
  })

  // ─── IPC: git:data — full git stats for a project directory ───────────────
  ipcMain.handle("git:data", async (_event, projectPath) => {
    try {
      const gitRoot = findGitRoot(projectPath)
      if (!gitRoot) return null
      const git = simpleGit(gitRoot)
      const isRepo = await git.checkIsRepo().catch(() => false)
      if (!isRepo) return null

      const logResult  = await git.log(["--max-count=100", "--stat"])
      const rawCommits = logResult.all || []

      let activeBranch = "main"
      try {
        const br = await git.revparse(["--abbrev-ref", "HEAD"])
        activeBranch = (br || "main").trim()
      } catch (_) {}

      const commits = rawCommits.map(c => {
        const diffStat = c.diff || {}
        return {
          hash:         (c.hash || "").slice(0, 7),
          fullHash:     c.hash || "",
          message:      c.message || "",
          author:       c.author_name || "Unknown",
          email:        c.author_email || "",
          date:         c.date || "",
          additions:    diffStat.insertions || 0,
          deletions:    diffStat.deletions  || 0,
          filesChanged: diffStat.changed    || 0,
          branch:       activeBranch,
        }
      })

      const contribMap = {}
      for (const c of commits) {
        if (!contribMap[c.author])
          contribMap[c.author] = { name: c.author, email: c.email, commits: 0, additions: 0, deletions: 0 }
        contribMap[c.author].commits++
        contribMap[c.author].additions += c.additions
        contribMap[c.author].deletions += c.deletions
      }
      const contributors = Object.values(contribMap).sort((a, b) => b.commits - a.commits)
      const totalCommits = contributors.reduce((s, c) => s + c.commits, 0)
      contributors.forEach(c => {
        c.pct = totalCommits ? Math.round(c.commits / totalCommits * 100) : 0
      })

      const heatmap = new Array(26 * 7).fill(0)
      const now = Date.now()
      for (const c of commits) {
        const msAgo   = now - new Date(c.date).getTime()
        const daysAgo = Math.floor(msAgo / 86400000)
        if (daysAgo < 182) {
          const idx = 181 - daysAgo
          if (idx >= 0 && idx < heatmap.length) heatmap[idx]++
        }
      }

      const fileChurnMap = {}
      try {
        const numstatLog = await git.raw(["log", "--numstat", "--max-count=200", "--pretty=format:"])
        const lines = numstatLog.split("\n").filter(Boolean)
        for (const line of lines) {
          const parts = line.split("\t")
          if (parts.length >= 3) {
            const adds = parseInt(parts[0]) || 0
            const dels = parseInt(parts[1]) || 0
            const file = parts[2]
            if (!file || file.includes("=>")) continue
            if (!fileChurnMap[file])
              fileChurnMap[file] = { file, additions: 0, deletions: 0, commits: 0 }
            fileChurnMap[file].additions += adds
            fileChurnMap[file].deletions += dels
            fileChurnMap[file].commits++
          }
        }
      } catch (_) {}

      const churnFiles = Object.values(fileChurnMap)
        .sort((a, b) => (b.additions + b.deletions) - (a.additions + a.deletions))
        .slice(0, 10)

      const thisWeek = commits.filter(
        c => (now - new Date(c.date).getTime()) < 7 * 86400000
      ).length

      const stats = {
        totalCommits: commits.length,
        contributors: contributors.length,
        thisWeek,
        filesChanged: churnFiles.length,
        additions:    commits.reduce((s, c) => s + c.additions, 0),
        deletions:    commits.reduce((s, c) => s + c.deletions, 0),
        activeBranch,
        lastCommit:   commits[0] ? new Date(commits[0].date).toLocaleDateString() : "never",
      }

      return { stats, commits, contributors, churnFiles, heatmap, gitRoot }
    } catch (err) {
      console.error("git:data error:", err)
      return null
    }
  })

  // ─── IPC: git:diff — get diff for a specific commit ───────────────────────
  ipcMain.handle("git:diff", async (_event, { projectPath, commitHash }) => {
    try {
      const gitRoot = findGitRoot(projectPath)
      if (!gitRoot) return { error: "Not a git repository" }
      const git  = simpleGit(gitRoot)
      const diff = await git.show([commitHash, "--stat", "--name-status"])
      return { diff }
    } catch (err) {
      return { error: err.message }
    }
  })

  // ─── IPC: git:status — get working tree status ────────────────────────────
  ipcMain.handle("git:status", async (_event, projectPath) => {
    try {
      const gitRoot = findGitRoot(projectPath)
      if (!gitRoot) return { error: "Not a git repository" }
      const git    = simpleGit(gitRoot)
      const status = await git.status()
      return {
        branch:   status.current  || "main",
        modified: status.modified || [],
        added:    status.not_added || [],
        deleted:  status.deleted  || [],
        staged:   status.staged   || [],
        isClean:  status.isClean(),
      }
    } catch (err) {
      return { error: err.message }
    }
  })

  // ─── IPC: git:commit-push — stage all, commit, and push ──────────────────
  ipcMain.handle("git:commit-push", async (_event, { projectPath, message, push }) => {
    try {
      const gitRoot = findGitRoot(projectPath)
      if (!gitRoot) return { error: "Not a git repository" }
      const git = simpleGit(gitRoot)
      await git.add(".")
      await git.commit(message || "chore: update via CodeCompass")
      if (push) {
        const status = await git.status()
        const branch = status.current || "main"
        await git.push("origin", branch)
      }
      return { success: true }
    } catch (err) {
      return { error: err.message }
    }
  })

  // ─── IPC: git:open-vscode — open project in VS Code ──────────────────────
  ipcMain.handle("git:open-vscode", async (_event, projectPath) => {
    try {
      const gitRoot = findGitRoot(projectPath) || projectPath
      const proc = spawn("code", [gitRoot], {
        detached: true,
        stdio:    "ignore",
        shell:    process.platform === "win32",
      })
      proc.unref()
      return { success: true }
    } catch (err) {
      return { error: err.message }
    }
  })
}

module.exports = { registerProjectIPC }