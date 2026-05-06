// gitService.js — real git log parsing via simple-git
// Called from electron/ipc/gitIPC.js

const simpleGit = require("simple-git")

/**
 * Returns { stats, commits, contributors, churnFiles, heatmap }
 */
async function getGitData(projectPath) {
  const git = simpleGit(projectPath)
  const isRepo = await git.checkIsRepo().catch(() => false)
  if (!isRepo) return null

  const [logResult, statusResult] = await Promise.all([
    git.log(["--stat", "--format=%H|%s|%an|%ae|%ar|%D", "-n", "50"]).catch(() => null),
    git.status().catch(() => null),
  ])

  if (!logResult) return null

  const commits = logResult.all.map(c => {
    const [hash, message, author, email, date, refs] = (c.hash + "|" + c.message + "|" + c.author_name + "|" + c.author_email + "|" + c.date + "|" + (c.refs||"")).split("|")
    const branch = refs?.includes("HEAD ->") ? refs.match(/HEAD -> ([^,]+)/)?.[1] || "main" : "main"
    return {
      hash: (c.hash||"").slice(0,7),
      fullHash: c.hash,
      message: c.message || "",
      author: c.author_name || "Unknown",
      email: c.author_email || "",
      date: c.date || "",
      branch,
      additions: c.diff?.insertions || 0,
      deletions:  c.diff?.deletions  || 0,
      filesChanged: c.diff?.files?.length || 0,
    }
  })

  // Build contributor stats
  const contribMap = {}
  for (const c of commits) {
    if (!contribMap[c.author]) contribMap[c.author] = { name: c.author, commits:0, additions:0, deletions:0 }
    contribMap[c.author].commits++
    contribMap[c.author].additions += c.additions
    contribMap[c.author].deletions += c.deletions
  }
  const totalCommits = commits.length
  const contributors = Object.values(contribMap)
    .sort((a,b) => b.commits-a.commits)
    .map(c => ({ ...c, pct: Math.round(c.commits/totalCommits*100) }))

  // Heatmap — 26 weeks × 7 days of commit counts
  const heatmap = new Array(26*7).fill(0)
  const now = Date.now()
  for (const c of logResult.all) {
    const msAgo = now - new Date(c.date).getTime()
    const daysAgo = Math.floor(msAgo / 86400000)
    if (daysAgo < 182) heatmap[182-daysAgo] = (heatmap[182-daysAgo]||0)+1
  }

  // File churn
  const churnMap = {}
  for (const c of logResult.all) {
    for (const f of (c.diff?.files||[])) {
      if (!churnMap[f.file]) churnMap[f.file] = { file:f.file, additions:0, deletions:0, commits:0 }
      churnMap[f.file].additions += f.insertions||0
      churnMap[f.file].deletions += f.deletions||0
      churnMap[f.file].commits++
    }
  }
  const churnFiles = Object.values(churnMap).sort((a,b)=>(b.additions+b.deletions)-(a.additions+a.deletions)).slice(0,10)

  const branch = await git.revparse(["--abbrev-ref","HEAD"]).catch(()=>"main")
  const stats = {
    totalCommits: commits.length,
    contributors: contributors.length,
    thisWeek: commits.filter(c => new Date(c.date) > new Date(Date.now()-7*86400000)).length,
    filesChanged: [...new Set(logResult.all.flatMap(c=>(c.diff?.files||[]).map(f=>f.file)))].length,
    additions: commits.reduce((s,c)=>s+c.additions,0),
    deletions: commits.reduce((s,c)=>s+c.deletions,0),
    activeBranch: branch.trim(),
    lastCommit: commits[0]?.date || "—",
  }

  return { stats, commits, contributors, churnFiles, heatmap }
}

module.exports = { getGitData }
