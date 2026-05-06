// server/analyzer/couplinganalyzer.js
// Detects high-coupling files and provides actionable insights.

/**
 * Analyse coupling for a list of files.
 * Each file: { path, imports: string[], lines?: number }
 *
 * Returns files sorted descending by coupling score.
 * score = fanOut * 1.5 + fanIn * 2
 */
function analyzeCoupling(files) {
  // Build fanIn map from base filenames (matches how scanProject normalises paths)
  const fanInMap = {}
  for (const f of files) {
    for (const imp of f.imports || []) {
      const key = imp.replace(/\\/g, "/").split("/").pop().replace(/\.[^.]+$/, "")
      fanInMap[key] = (fanInMap[key] || 0) + 1
    }
  }

  const results = files.map(f => {
    const name   = f.path.replace(/\\/g, "/").split("/").pop().replace(/\.[^.]+$/, "")
    const fanOut = (f.imports || []).length
    const fanIn  = fanInMap[name] || 0
    const score  = Math.round(fanOut * 1.5 + fanIn * 2)
    const risk   = score > 20 ? "critical" : score > 12 ? "high" : score > 6 ? "medium" : "low"

    return { path: f.path, fanIn, fanOut, score, risk, lines: f.lines || 0 }
  })

  results.sort((a, b) => b.score - a.score)
  return results
}

/**
 * Return only the top N most coupled files.
 */
function getTopCoupled(files, n = 10) {
  return analyzeCoupling(files).slice(0, n)
}

/**
 * Summarise coupling health across the whole project.
 */
function couplingHealth(files) {
  const all = analyzeCoupling(files)
  const critical = all.filter(f => f.risk === "critical").length
  const high     = all.filter(f => f.risk === "high").length
  const medium   = all.filter(f => f.risk === "medium").length
  const healthy  = all.filter(f => f.risk === "low").length
  return { total: all.length, critical, high, medium, healthy }
}

module.exports = { analyzeCoupling, getTopCoupled, couplingHealth }
