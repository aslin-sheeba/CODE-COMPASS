// Pre-lowercased index — avoids repeated .toLowerCase() per query
let filesIndex = []

// Extract function/method names from source content
function extractFunctionNames(content) {
  const names = new Set()
  const patterns = [
    /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\(/g,
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?function/g,
    /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s*)?function/g,
    /export\s+(?:default\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /export\s+(?:default\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
  ]
  for (const re of patterns) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(content)) !== null) {
      if (m[1] && m[1].length > 1) names.add(m[1])
    }
  }
  return [...names]
}

function extractModuleName(path) {
  return (path || "").replace(/\\/g, "/").split("/").pop().replace(/\.[^.]+$/, "")
}

export function buildIndex(files) {
  filesIndex = files.map(f => {
    const fns = extractFunctionNames(f.content || "")
    return {
      path:               f.path,
      pathLower:          f.path.toLowerCase(),
      moduleName:         extractModuleName(f.path),
      moduleNameLower:    extractModuleName(f.path).toLowerCase(),
      imports:            f.imports || [],
      importsLower:       (f.imports || []).map(i => i.toLowerCase()),
      content:            f.content || "",
      lines:              (f.content || "").split("\n"),
      linesLower:         (f.content || "").toLowerCase().split("\n"),
      functionNames:      fns,
      functionNamesLower: fns.map(n => n.toLowerCase()),
    }
  })
}

export function search(query, { filterType = "all" } = {}) {
  if (!query || !query.trim()) return []
  const q       = query.toLowerCase()
  const results = []

  for (const file of filesIndex) {
    if (filterType === "function") {
      const matchedFns = file.functionNames.filter((_, i) => file.functionNamesLower[i].includes(q))
      for (const fn of matchedFns) {
        const lineIdx = file.linesLower.findIndex(l => l && l.includes(fn.toLowerCase()) &&
          (l.includes("function") || l.includes("=>") || l.includes("const") || l.includes("class")))
        results.push({
          path: file.path,
          line: lineIdx >= 0 ? lineIdx + 1 : null,
          snippet: lineIdx >= 0 ? file.lines[lineIdx].trim() : `function: ${fn}`,
          matchType: "function",
          matchedName: fn,
        })
      }
      continue
    }

    if (filterType === "module") {
      if (file.moduleNameLower.includes(q)) {
        results.push({ path: file.path, line: null, snippet: null, matchType: "module" })
      }
      continue
    }

    // Default "all": path → imports → content
    if (file.pathLower.includes(q)) {
      results.push({ path: file.path, line: null, snippet: null, matchType: "path" })
      continue
    }

    const impIdx = file.importsLower.findIndex(i => i.includes(q))
    if (impIdx !== -1) {
      results.push({ path: file.path, line: null, snippet: `import: ${file.imports[impIdx]}`, matchType: "import" })
      continue
    }

    for (let i = 0; i < file.linesLower.length; i++) {
      if (file.linesLower[i] && file.linesLower[i].includes(q)) {
        results.push({ path: file.path, line: i + 1, snippet: file.lines[i].trim(), matchType: "content" })
        break
      }
    }
  }

  return results
}

export function getFunctionNames(filePath) {
  const file = filesIndex.find(f => f.path === filePath)
  return file ? file.functionNames : []
}
