export function findUnusedFiles(files) {
  const fanInMap = {}

  // build fan-in map
  files.forEach(f => {
    (f.imports || []).forEach(imp => {
      fanInMap[imp] = (fanInMap[imp] || 0) + 1
    })
  })

  // define root files (you can expand this later)
  const isRootFile = (path) => {
    return (
      path.includes("main.") ||
      path.includes("App.") ||
      path.includes("index.")
    )
  }

  // find unused
  return files.filter(f => {
    const fanIn = fanInMap[f.path] || 0
    return fanIn === 0 && !isRootFile(f.path)
  })
}
