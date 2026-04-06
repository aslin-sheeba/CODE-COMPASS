// Fixes: visited Set shared correctly across recursion to prevent cycles (#4, #11)
export function calculateMetrics(files) {
  const fileMap = {}
  for (const f of files) fileMap[f.path] = { ...f }

  // O(n) fan-in map
  const fanInMap = {}
  for (const f of files) {
    for (const imp of f.imports || []) {
      fanInMap[imp] = (fanInMap[imp] || 0) + 1
    }
  }

  // Depth with correctly-threaded visited Set (prevents inf recursion on cycles)
  const getDepth = (file, visited) => {
    if (!file || visited.has(file.path)) return 0
    visited.add(file.path)

    let max = 0
    for (const imp of (file.imports || [])) {
      const next = fileMap[imp]
      const d    = 1 + getDepth(next, visited)
      if (d > max) max = d
    }
    return max
  }

  return files.map(f => {
    const fanOut = (f.imports || []).length
    const fanIn  = fanInMap[f.path] || 0
    const depth  = getDepth(f, new Set())   // fresh Set per top-level file
    const risk   = fanOut * 1.5 + fanIn * 2 + depth * 1.2

    return {
      ...f,
      metrics: { fanIn, fanOut, depth, risk: Math.round(risk) },
    }
  })
}