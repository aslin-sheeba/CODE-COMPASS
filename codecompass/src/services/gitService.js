// server/git/gitService.js
// Real git history parsing using simple-git (already in package.json as ^3.33.0)

const simpleGit = require("simple-git")

/**
 * Returns the full git data payload expected by GitActivity.jsx:
 * { stats, commits, contributors, churnFiles, heatmap }
 *
 * @param {string} projectPath  - absolute path to the project root
 * @returns {Promise<object>}
 */
async function getGitData(projectPath) {
  const git = simpleGit(projectPath)

  // Verify this is a git repo
  const isRepo = await git.checkIsRepo().catch(() => false)
  if (!isRepo) return null

  // ── 1. Log (last 200 commits) ──────────────────────────────────────────────
  const logResult = await git.log([
    "--max-count=200",
    "--stat",
    `--format=%H|||%h|||%s|||%an|||%ae|||%ar|||%ad`,
    "--date=short",
  ]).catch(() => null)

  const commits = []
  if (logResult?.all) {
    for (const entry of logResult.all) {
      // simple-git parses --format entries into .hash, .message, .author_name, etc.
      const additions = entry.diff?.insertions || 0
      const deletions = entry.diff?.deletions  || 0
      const filesChanged = entry.diff?.changed  || 0
      commits.push({
        hash:         (entry.hash || "").slice(0, 7),
        fullHash:     entry.hash || "",
        message:      entry.message || "",
        author:       entry.author_name || "Unknown",
        email:        entry.author_email || "",
        date:         entry.date || "",
        branch:       "main",   // enriched below
        additions,
        deletions,
        filesChanged,
      })
    }
  }

  // ── 2. Branch per commit (best-effort, non-fatal) ─────────────────────────
  try {
    const branchData = await git.branch(["-a", "--format=%(objectname:short)|||%(refname:short)"])
    if (branchData?.all) {
      const hashToBranch = {}
      for (const line of branchData.all) {
        const [h, b] = line.split("|||")
        if (h && b) hashToBranch[h] = b.replace(/^origin\//, "")
      }
      for (const c of commits) {
        if (hashToBranch[c.hash]) c.branch = hashToBranch[c.hash]
      }
    }
  } catch { /* non-fatal */ }

  // ── 3. Contributors ────────────────────────────────────────────────────────
  const authorMap = {}
  for (const c of commits) {
    const key = c.author
    if (!authorMap[key]) authorMap[key] = { name: key, commits: 0, additions: 0, deletions: 0 }
    authorMap[key].commits++
    authorMap[key].additions += c.additions
    authorMap[key].deletions += c.deletions
  }
  const totalCommits = commits.length || 1
  const contributors = Object.values(authorMap)
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 6)
    .map(c => ({ ...c, pct: Math.round((c.commits / totalCommits) * 100) }))

  // ── 4. Churn (most-changed files) ─────────────────────────────────────────
  const fileChurn = {}
  try {
    const raw = await git.raw(["log", "--name-only", "--pretty=format:", "--max-count=500"])
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
      if (!line.includes(" ") && (line.includes(".") || line.includes("/"))) {
        fileChurn[line] = (fileChurn[line] || 0) + 1
      }
    }
  } catch { /* non-fatal */ }

  const churnFiles = Object.entries(fileChurn)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, additions: 0, deletions: 0, commits: count }))

  // ── 5. Stats summary ───────────────────────────────────────────────────────
  const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const thisWeek = commits.filter(c => {
    const d = new Date(c.date)
    return !isNaN(d) && d >= oneWeekAgo
  }).length

  const totalAdditions = commits.reduce((s, c) => s + c.additions, 0)
  const totalDeletions = commits.reduce((s, c) => s + c.deletions, 0)

  let activeBranch = "main"
  let lastCommit = commits[0]?.date || "unknown"
  try {
    activeBranch = (await git.revparse(["--abbrev-ref", "HEAD"])).trim()
  } catch { /* non-fatal */ }

  const stats = {
    totalCommits: commits.length,
    contributors: contributors.length,
    thisWeek,
    filesChanged: Object.keys(fileChurn).length,
    additions:    totalAdditions,
    deletions:    totalDeletions,
    activeBranch,
    lastCommit,
  }

  // ── 6. Heatmap (last 26 weeks × 7 days) ───────────────────────────────────
  const heatmap = new Array(26 * 7).fill(0)
  try {
    const now   = new Date()
    const start = new Date(now); start.setDate(start.getDate() - 26 * 7)

    for (const c of commits) {
      const d = new Date(c.date)
      if (isNaN(d) || d < start) continue
      const diffDays = Math.floor((now - d) / 86400000)
      const cell     = (26 * 7 - 1) - diffDays
      if (cell >= 0 && cell < heatmap.length) heatmap[cell]++
    }
  } catch { /* non-fatal */ }

  return { stats, commits, contributors, churnFiles, heatmap }
}

/**
 * Returns git status (modified, added, deleted, untracked)
 * @param {string} projectPath
 */
async function getGitStatus(projectPath) {
  const git = simpleGit(projectPath)
  const isRepo = await git.checkIsRepo().catch(() => false)
  if (!isRepo) return { error: "Not a git repository" }

  try {
    const status = await git.status()
    return {
      modified:  status.modified  || [],
      added:     status.created   || [],
      deleted:   status.deleted   || [],
      untracked: status.not_added || [],
      staged:    status.staged    || [],
      branch:    status.current   || "unknown",
      ahead:     status.ahead     || 0,
      behind:    status.behind    || 0,
    }
  } catch (e) {
    return { error: e.message }
  }
}

/**
 * Returns unified diff for a specific commit
 * @param {string} projectPath
 * @param {string} commitHash
 */
async function getGitDiff(projectPath, commitHash) {
  const git = simpleGit(projectPath)
  try {
    const diff = await git.show([commitHash, "--stat", "--patch", "--format="])
    return { diff }
  } catch (e) {
    return { error: e.message }
  }
}

/**
 * Stages all changes, commits, and optionally pushes
 * @param {string} projectPath
 * @param {string} message       - commit message
 * @param {boolean} push         - whether to push after committing
 */
async function gitCommitPush(projectPath, message, push = true) {
  const git = simpleGit(projectPath)
  try {
    await git.add(".")
    const commit = await git.commit(message)
    if (push) {
      const status = await git.status()
      const branch = status.current || "main"
      await git.push("origin", branch)
    }
    return { success: true, commit: commit.commit }
  } catch (e) {
    return { error: e.message }
  }
}

module.exports = { getGitData, getGitStatus, getGitDiff, gitCommitPush }