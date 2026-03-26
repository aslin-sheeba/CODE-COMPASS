const { ipcMain, dialog, BrowserWindow } = require("electron")
const path = require("path")
const https = require("https")
const fs = require("fs")
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

// ── Fetch helpers ─────────────────────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { "User-Agent": "CodeCompass/1.0" } }, (res) => {
      let data = ""
      res.on("data", chunk => data += chunk)
      res.on("end", () => {
        try { resolve(JSON.parse(data)) } catch { resolve(null) }
      })
    }).on("error", () => resolve(null))
  })
}

// ── Version comparison ────────────────────────────────────────────────────────
function parseVersion(v) {
  return (v || "0").replace(/[^0-9.]/g, "").split(".").map(Number)
}

function versionsBehind(installed, latest) {
  const i = parseVersion(installed)
  const l = parseVersion(latest)
  return {
    major: Math.max(0, (l[0] || 0) - (i[0] || 0)),
    minor: Math.max(0, (l[1] || 0) - (i[1] || 0)),
    patch: Math.max(0, (l[2] || 0) - (i[2] || 0)),
  }
}

function scoreRisk(installed, latest, deprecated) {
  let score   = 0
  const reasons = []

  if (deprecated) {
    score += 40
    reasons.push("Package is deprecated")
  }

  if (installed && latest && installed !== latest) {
    const behind = versionsBehind(installed, latest)
    if (behind.major >= 2) {
      score += 35
      reasons.push(`${behind.major} major versions behind`)
    } else if (behind.major === 1) {
      score += 20
      reasons.push("1 major version behind")
    } else if (behind.minor >= 5) {
      score += 10
      reasons.push(`${behind.minor} minor versions behind`)
    } else if (behind.patch > 0) {
      score += 3
      reasons.push("Patch update available")
    }
  }

  let risk = "low"
  if (score >= 35)      risk = "critical"
  else if (score >= 20) risk = "high"
  else if (score >= 10) risk = "medium"

  return { score, risk, reasons }
}

// ── SCANNERS per ecosystem ────────────────────────────────────────────────────

// npm
async function scanNpm(projectPath) {
  const pkgPath = path.join(projectPath, "package.json")
  if (!fs.existsSync(pkgPath)) return []

  let pkg
  try { pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) }
  catch { return [] }

  const allDeps = {
    ...(pkg.dependencies    || {}),
    ...(pkg.devDependencies || {}),
  }

  const results = []
  for (const [name, versionRange] of Object.entries(allDeps)) {
    const installed = versionRange.replace(/[\^~>=<]/g, "").trim()
    const info      = await httpsGet(`https://registry.npmjs.org/${name}/latest`)
    const latest    = info?.version || null
    const { score, risk, reasons } = scoreRisk(
      installed, latest, info?.deprecated
    )
    results.push({
      name, installed,
      latest:      latest || "unknown",
      isOutdated:  latest ? installed !== latest : false,
      deprecated:  info?.deprecated || null,
      license:     info?.license || "unknown",
      description: (info?.description || "").slice(0, 90),
      isDev:       !!(pkg.devDependencies?.[name]),
      ecosystem:   "npm",
      riskScore:   score, risk, reasons,
    })
  }
  return results
}

// pip / requirements.txt
async function scanPip(projectPath) {
  const reqPath = path.join(projectPath, "requirements.txt")
  if (!fs.existsSync(reqPath)) return []

  const lines = fs.readFileSync(reqPath, "utf-8").split("\n")
  const results = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const match = trimmed.match(/^([A-Za-z0-9_.-]+)([>=<!~^]+)?(.*)$/)
    if (!match) continue
    const name      = match[1]
    const installed = match[3]?.trim().split(",")[0] || "unknown"
    const info      = await httpsGet(
      `https://pypi.org/pypi/${name}/json`
    )
    const latest = info?.info?.version || null
    const deprecated = info?.info?.classifiers?.some(
      c => c.includes("Inactive") || c.includes("Abandoned")
    ) ? "Possibly inactive" : null

    const { score, risk, reasons } = scoreRisk(installed, latest, deprecated)
    results.push({
      name, installed, latest: latest || "unknown",
      isOutdated: latest ? installed !== latest : false,
      deprecated, license: info?.info?.license || "unknown",
      description: (info?.info?.summary || "").slice(0, 90),
      isDev: false, ecosystem: "pip",
      riskScore: score, risk, reasons,
    })
  }
  return results
}

// Cargo.toml (Rust)
async function scanCargo(projectPath) {
  const cargoPath = path.join(projectPath, "Cargo.toml")
  if (!fs.existsSync(cargoPath)) return []

  const content = fs.readFileSync(cargoPath, "utf-8")
  const results = []
  const depSection = content.match(
    /\[dependencies\]([\s\S]*?)(\[|$)/
  )?.[1] || ""

  for (const line of depSection.split("\n")) {
    const match = line.match(/^([a-z0-9_-]+)\s*=\s*"([^"]+)"/)
    if (!match) continue
    const name      = match[1]
    const installed = match[2].replace(/[\^~>=]/g, "")
    const info      = await httpsGet(
      `https://crates.io/api/v1/crates/${name}`
    )
    const latest = info?.crate?.newest_version || null
    const { score, risk, reasons } = scoreRisk(installed, latest, null)
    results.push({
      name, installed, latest: latest || "unknown",
      isOutdated: latest ? installed !== latest : false,
      deprecated: null,
      license: info?.crate?.license || "unknown",
      description: (info?.crate?.description || "").slice(0, 90),
      isDev: false, ecosystem: "cargo",
      riskScore: score, risk, reasons,
    })
  }
  return results
}

// go.mod (Go)
async function scanGoMod(projectPath) {
  const goPath = path.join(projectPath, "go.mod")
  if (!fs.existsSync(goPath)) return []

  const content = fs.readFileSync(goPath, "utf-8")
  const results = []
  const requireBlock = content.match(/require\s*\(([\s\S]*?)\)/)?.[1] || ""

  for (const line of requireBlock.split("\n")) {
    const match = line.trim().match(/^(\S+)\s+v?([^\s]+)/)
    if (!match) continue
    const name      = match[1]
    const installed = match[2]
    results.push({
      name, installed, latest: "see pkg.go.dev",
      isOutdated: false, deprecated: null,
      license: "unknown",
      description: "",
      isDev: false, ecosystem: "go",
      riskScore: 0, risk: "low", reasons: [],
    })
  }
  return results
}

// composer.json (PHP)
async function scanComposer(projectPath) {
  const compPath = path.join(projectPath, "composer.json")
  if (!fs.existsSync(compPath)) return []

  let comp
  try { comp = JSON.parse(fs.readFileSync(compPath, "utf-8")) }
  catch { return [] }

  const allDeps = {
    ...(comp.require     || {}),
    ...(comp["require-dev"] || {}),
  }

  const results = []
  for (const [name, version] of Object.entries(allDeps)) {
    if (name === "php") continue
    const installed = version.replace(/[\^~>=<]/g, "").trim()
    const safeName  = name.replace("/", "%2F")
    const info      = await httpsGet(
      `https://repo.packagist.org/p2/${safeName}.json`
    )
    const latest = info?.packages?.[name]?.[0]?.version || null
    const { score, risk, reasons } = scoreRisk(installed, latest, null)
    results.push({
      name, installed, latest: latest || "unknown",
      isOutdated: latest ? installed !== latest : false,
      deprecated: null, license: "unknown",
      description: "",
      isDev: !!(comp["require-dev"]?.[name]),
      ecosystem: "composer",
      riskScore: score, risk, reasons,
    })
  }
  return results
}

// Gemfile (Ruby)
async function scanGemfile(projectPath) {
  const gemPath = path.join(projectPath, "Gemfile")
  if (!fs.existsSync(gemPath)) return []

  const content = fs.readFileSync(gemPath, "utf-8")
  const results = []

  for (const line of content.split("\n")) {
    const match = line.match(/^\s*gem\s+['"]([^'\"]+)['"]\s*(?:,\s*['"]([^'\"]+)['"])?/)
    if (!match) continue
    const name      = match[1]
    const installed = match[2]?.replace(/[\^~>=<]/g, "").trim() || "unknown"
    const info      = await httpsGet(`https://rubygems.org/api/v1/gems/${name}.json`)
    const latest    = info?.version || null
    const { score, risk, reasons } = scoreRisk(installed, latest, null)
    results.push({
      name, installed, latest: latest || "unknown",
      isOutdated: latest ? installed !== latest : false,
      deprecated: null,
      license: info?.licenses?.[0] || "unknown",
      description: (info?.info || "").slice(0, 90),
      isDev: false, ecosystem: "gem",
      riskScore: score, risk, reasons,
    })
  }
  return results
}

// ── MAIN IPC HANDLER ──────────────────────────────────────────────────────────
ipcMain.handle("deps:analyze", async (_, projectPath) => {
  if (!projectPath) return null

  // Normalize path separators
  const normalPath = projectPath.replace(/\//g, path.sep)

  // Search for manifest files walking up to 2 levels up
  function findRoot(startPath) {
    const manifests = [
      "package.json", "requirements.txt",
      "Cargo.toml", "go.mod", "composer.json", "Gemfile"
    ]
    let current = startPath
    for (let i = 0; i < 3; i++) {
      const hasManifest = manifests.some(m =>
        fs.existsSync(path.join(current, m))
      )
      if (hasManifest) return current
      const parent = path.dirname(current)
      if (parent === current) break
      current = parent
    }
    return startPath
  }

  const root = findRoot(normalPath)
  console.log("Found project root:", root)

  const [npm, pip, cargo, goMod, composer, gems] = await Promise.all([
    scanNpm(root),
    scanPip(root),
    scanCargo(root),
    scanGoMod(root),
    scanComposer(root),
    scanGemfile(root),
  ])

  const allPackages = [
    ...npm, ...pip, ...cargo,
    ...goMod, ...composer, ...gems
  ]

  if (allPackages.length === 0) return null

  allPackages.sort((a, b) => b.riskScore - a.riskScore)

  const ecosystems = [...new Set(allPackages.map(p => p.ecosystem))]

  return { ecosystems, totalDeps: allPackages.length, packages: allPackages }
})