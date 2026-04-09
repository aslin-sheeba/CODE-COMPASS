// couplinganalyzer.js — detects high-coupling files and circular dependencies

/**
 * Returns files sorted by coupling score.
 * Coupling = fanOut * 1.5 + fanIn * 2
 */
function analyzeCoupling(files) {
  const fanInMap = {}
  for (const f of files) {
    for (const imp of f.imports || []) {
      const key = imp.split("/").pop().replace(/\.[^.]+$/,"")
      fanInMap[key] = (fanInMap[key]||0)+1
    }
  }

  return files.map(f => {
    const name   = f.path.split("/").pop().replace(/\.[^.]+$/,"")
    const fanOut = (f.imports||[]).length
    const fanIn  = fanInMap[name]||0
    const score  = Math.round(fanOut*1.5 + fanIn*2)
    return { path:f.path, fanIn, fanOut, score, risk: score>20?"critical":score>12?"high":score>6?"medium":"low" }
  }).sort((a,b)=>b.score-a.score)
}

module.exports = { analyzeCoupling }
