// Correct path matching — normalises both sides before comparing (#13)
function normPath(p) {
  return (p || "").replace(/\\/g, "/")
}

export function findUnusedFiles(files) {
  const fanInSet = new Set()

  for (const f of files) {
    for (const imp of f.imports || []) {
      fanInSet.add(normPath(imp))
    }
  }

  const isRootFile = (path) => {
    const n = normPath(path)
    return n.includes("main.") || n.includes("App.") || n.includes("index.")
  }

  return files.filter(f => {
    const p = normPath(f.path)
    return !fanInSet.has(p) && !isRootFile(p)
  })
}