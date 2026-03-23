const { ipcMain, dialog, BrowserWindow } = require("electron")
const path = require("path")
const { fork } = require("child_process")

ipcMain.handle("project:select", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"]
  })

  if (result.canceled) return null

  const folderPath = result.filePaths[0]

  try {
    const win = BrowserWindow.getAllWindows()[0]

    const workerPath = path.join(__dirname, "..", "scannerWorker.js")
    const child = fork(workerPath)

    return await new Promise((resolve) => {
      child.on("message", (msg) => {
        if (!msg || !msg.type) return
        if (msg.type === "progress") {
          if (win && win.webContents) win.webContents.send("project:scan-progress", msg.progress)
        } else if (msg.type === "result") {
          resolve(msg.files)
        } else if (msg.type === "error") {
          console.error("Worker error:", msg.error)
          resolve(null)
        }
      })

      child.on("exit", (code) => {
        // If child exits without sending result, resolve null
        resolve(null)
      })

      child.send({ type: "scan", folder: folderPath })
    })
  } catch (err) {
    console.error("Failed to start scanner worker:", err)
    return null
  }
})
const simpleGit = require("simple-git")

ipcMain.handle("git:getData", async (_, folderPath) => {
  try {
    const git = simpleGit(folderPath)

    // Check if it's a git repo
    const isRepo = await git.checkIsRepo()
    if (!isRepo) return null

    // Fetch all data in parallel
    const [log, status, branches] = await Promise.all([
      git.log({ maxCount: 50, "--stat": null }),
      git.status(),
      git.branch(),
    ])

    // Build contributor map
    const contributorMap = {}
    log.all.forEach(commit => {
      const name = commit.author_name
      if (!contributorMap[name]) {
        contributorMap[name] = {
          name,
          email: commit.author_email,
          commits: 0,
          additions: 0,
          deletions: 0,
        }
      }
      contributorMap[name].commits++
    })

    // Build file churn map
    const churnMap = {}
    log.all.forEach(commit => {
      if (!commit.diff) return
      commit.diff.files.forEach(f => {
        if (!churnMap[f.file]) {
          churnMap[f.file] = {
            file: f.file,
            additions: 0,
            deletions: 0,
            commits: 0
          }
        }
        churnMap[f.file].additions += f.insertions || 0
        churnMap[f.file].deletions += f.deletions  || 0
        churnMap[f.file].commits++
      })
    })

    // Weekly heatmap (26 weeks × 7 days)
    const heatmap = Array(26 * 7).fill(0)
    const now = Date.now()
    log.all.forEach(commit => {
      const age  = now - new Date(commit.date).getTime()
      const days = Math.floor(age / (1000 * 60 * 60 * 24))
      const idx  = days
      if (idx >= 0 && idx < 26 * 7) heatmap[idx]++
    })

    // Compute totals
    const totalAdditions = log.all.reduce((a, c) =>
      a + (c.diff?.insertions || 0), 0)
    const totalDeletions = log.all.reduce((a, c) =>
      a + (c.diff?.deletions || 0), 0)

    const contributors = Object.values(contributorMap)
    const totalCommits = contributors.reduce((a, c) => a + c.commits, 0)

    // Add percentage
    contributors.forEach(c => {
      c.pct = Math.round((c.commits / totalCommits) * 100)
    })
    contributors.sort((a, b) => b.commits - a.commits)

    const churnFiles = Object.values(churnMap)
      .sort((a, b) => (b.additions + b.deletions) - (a.additions + a.deletions))
      .slice(0, 10)

    // Format commits for table
    const commits = log.all.slice(0, 30).map(c => ({
      hash:         c.hash.slice(0, 7),
      fullHash:     c.hash,
      message:      c.message,
      author:       c.author_name,
      email:        c.author_email,
      date:         formatDate(c.date),
      branch:       branches.current,
      additions:    c.diff?.insertions || 0,
      deletions:    c.diff?.deletions  || 0,
      filesChanged: c.diff?.files?.length || 0,
    }))

    return {
      stats: {
        totalCommits: log.total,
        contributors: contributors.length,
        thisWeek: log.all.filter(c => {
          const age = Date.now() - new Date(c.date).getTime()
          return age < 7 * 24 * 60 * 60 * 1000
        }).length,
        filesChanged: churnFiles.length,
        additions:    totalAdditions,
        deletions:    totalDeletions,
        activeBranch: branches.current,
        lastCommit:   formatDate(log.latest?.date),
      },
      commits,
      contributors,
      churnFiles,
      heatmap,
    }

  } catch (err) {
    console.error("Git error:", err)
    return null
  }
})

function formatDate(dateStr) {
  if (!dateStr) return "unknown"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  <  60) return `${mins}m ago`
  if (hours <  24) return `${hours}h ago`
  if (days  <  30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}