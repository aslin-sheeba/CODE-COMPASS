// Pre-lowercased index — avoids repeated .toLowerCase() per query (#7)
let filesIndex = []

export function buildIndex(files) {
  filesIndex = files.map(f => ({
    path:        f.path,
    pathLower:   f.path.toLowerCase(),
    imports:     f.imports || [],
    importsLower:(f.imports || []).map(i => i.toLowerCase()),
    content:     f.content || "",
    lines:       (f.content || "").split("\n"),
    linesLower:  (f.content || "").toLowerCase().split("\n"),
  }))
}

export function search(query) {
  if (!query || !query.trim()) return []
  const q       = query.toLowerCase()
  const results = []

  for (const file of filesIndex) {
    if (file.pathLower.includes(q)) {
      results.push({ path: file.path, line: null, snippet: null })
      continue
    }

    const impIdx = file.importsLower.findIndex(i => i.includes(q))
    if (impIdx !== -1) {
      results.push({ path: file.path, line: null, snippet: `import: ${file.imports[impIdx]}` })
      continue
    }

    for (let i = 0; i < file.linesLower.length; i++) {
      if (file.linesLower[i] && file.linesLower[i].includes(q)) {
        results.push({ path: file.path, line: i + 1, snippet: file.lines[i].trim() })
        break
      }
    }
  }

  return results
}