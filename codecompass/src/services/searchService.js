let filesIndex = []

export function buildIndex(files) {
  filesIndex = files.map((f) => ({
    path: f.path,
    imports: f.imports || [],
    content: f.content || "",
    lines: (f.content || "").split("\n")
  }))
}

export function search(query) {
  if (!query || !query.trim()) return []
  const q = query.toLowerCase()
  const results = []

  for (const file of filesIndex) {
    // filename match
    if (file.path.toLowerCase().includes(q)) {
      results.push({ path: file.path, line: null, snippet: null })
      continue
    }

    // imports match
    const impMatch = file.imports.find((i) => i.toLowerCase().includes(q))
    if (impMatch) {
      results.push({ path: file.path, line: null, snippet: `import: ${impMatch}` })
      continue
    }

    // content matches - collect first few matching lines
    for (let i = 0; i < file.lines.length; i++) {
      const lineText = file.lines[i]
      if (lineText && lineText.toLowerCase().includes(q)) {
        const snippet = lineText.trim()
        results.push({ path: file.path, line: i + 1, snippet })
        break
      }
    }
  }

  return results
}
