export function calculateMetrics(files) {
  const fileMap = {}
  files.forEach(f => {
    fileMap[f.path] = { ...f }
  })

  // 📤 fan-in map
  const fanInMap = {}
  files.forEach(f => {
    (f.imports || []).forEach(imp => {
      fanInMap[imp] = (fanInMap[imp] || 0) + 1
    })
  })

  // 🧠 depth calc
  const getDepth = (file, visited = new Set()) => {
    if (!file || visited.has(file.path)) return 0
    visited.add(file.path)

    let max = 0
    file.imports.forEach(imp => {
      const next = fileMap[imp]
      const d = 1 + getDepth(next, visited)
      if (d > max) max = d
    })

    return max
  }

  // 🔥 build metrics
  return files.map(f => {
    const fanOut = (f.imports || []).length
    const fanIn = fanInMap[f.path] || 0
    const depth = getDepth(f)

    const risk =
      fanOut * 1.5 +
      fanIn * 2 +
      depth * 1.2

    return {
      ...f,
      metrics: {
        fanIn,
        fanOut,
        depth,
        risk: Math.round(risk)
      }
    }
  })
}

