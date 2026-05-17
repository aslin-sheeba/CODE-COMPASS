// Pre-lowercased index — optimized for fast searching
let filesIndex = []

// Extract function names from content using regex
function extractFunctions(content) {
  const functions = []
  if (!content) return functions
  
  // Match function declarations: function name() {}, const name = () => {}, export function name() {}
  const patterns = [
    /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
    /(?:export\s+)?const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\(/g,
    /(?:export\s+)?(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s*)?\(/g,
    /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*{/g,
  ]
  
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      if (match[1] && !functions.includes(match[1])) {
        functions.push(match[1])
      }
    }
  }
  
  return functions
}

export function buildIndex(files) {
  filesIndex = files.map(f => {
    const path = f.path || ""
    const realPath = f.realPath || f.path || ""
    const fileName = path.split(/[\\/]/).pop() || ""
    const fileExt = fileName.match(/\.[^.]+$/)?.[0] || ""
    const content = f.content || ""
    const imports = f.imports || []
    const functions = extractFunctions(content)
    
    return {
      path,
      realPath,
      pathLower:    path.toLowerCase(),
      fileName,
      fileNameLower: fileName.toLowerCase(),
      fileExt,
      imports,
      importsLower: imports.map(i => i.toLowerCase()),
      functions,
      functionsLower: functions.map(fn => fn.toLowerCase()),
      content,
      lines:        content.split("\n"),
      linesLower:   content.toLowerCase().split("\n"),
    }
  })
}

// Core search with type support
export function search(query, filterType = "all") {
  if (!query || !query.trim()) return []
  const q = query.toLowerCase()
  const results = []
  const seen = new Set()

  for (const file of filesIndex) {
    // Search by file name
    if (filterType === "all" || filterType === "filename") {
      if (file.fileNameLower.includes(q)) {
        const key = `${file.path}:filename`
        if (!seen.has(key)) {
          seen.add(key)
          results.push({
            type: "filename",
            path: file.path,
            realPath: file.realPath,
            fileName: file.fileName,
            line: null,
            snippet: `File: ${file.fileName}`,
            priority: 10
          })
        }
      }
    }

    // Search by function names
    if (filterType === "all" || filterType === "function") {
      for (const fn of file.functionsLower) {
        if (fn.includes(q)) {
          const key = `${file.path}:${fn}`
          if (!seen.has(key)) {
            seen.add(key)
            results.push({
              type: "function",
              path: file.path,
              realPath: file.realPath,
              fileName: file.fileName,
              line: null,
              snippet: `Function: ${file.functions[file.functionsLower.indexOf(fn)]}()`,
              priority: 8
            })
          }
        }
      }
    }

    // Search by imports
    if (filterType === "all" || filterType === "import") {
      for (let i = 0; i < file.importsLower.length; i++) {
        if (file.importsLower[i].includes(q)) {
          const key = `${file.path}:import:${i}`
          if (!seen.has(key)) {
            seen.add(key)
            results.push({
              type: "import",
              path: file.path,
              realPath: file.realPath,
              fileName: file.fileName,
              line: null,
              snippet: `Import: ${file.imports[i]}`,
              priority: 7
            })
          }
        }
      }
    }

    // Search by content (code lines)
    if (filterType === "all" || filterType === "content") {
      for (let i = 0; i < file.linesLower.length; i++) {
        if (file.linesLower[i] && file.linesLower[i].includes(q)) {
          const key = `${file.path}:line:${i}`
          if (!seen.has(key)) {
            seen.add(key)
            results.push({
              type: "content",
              path: file.path,
              realPath: file.realPath,
              fileName: file.fileName,
              line: i + 1,
              snippet: file.lines[i].trim(),
              priority: 5
            })
          }
        }
      }
    }
  }

  // Sort by priority (higher first), then by path
  return results.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    return a.path.localeCompare(b.path)
  })
}

// Filter searches by file extension
export function searchByExtension(query, extension) {
  if (!query || !query.trim()) return []
  const q = query.toLowerCase()
  const ext = extension.toLowerCase()
  const results = []

  for (const file of filesIndex) {
    if (!file.fileExt.toLowerCase().includes(ext)) continue

    if (file.fileNameLower.includes(q)) {
      results.push({
        type: "filename",
        path: file.path,
        fileName: file.fileName,
        snippet: file.fileName,
        priority: 10
      })
      continue
    }

    for (let i = 0; i < file.linesLower.length; i++) {
      if (file.linesLower[i] && file.linesLower[i].includes(q)) {
        results.push({
          type: "content",
          path: file.path,
          fileName: file.fileName,
          line: i + 1,
          snippet: file.lines[i].trim(),
          priority: 5
        })
        break
      }
    }
  }

  return results
}

// Search for unused files (files with no imports from others)
export function findUnusedFiles() {
  const results = []
  const importedFiles = new Set()

  // Track which files are imported
  for (const file of filesIndex) {
    for (const imp of file.imports) {
      const normalized = imp.toLowerCase().replace(/\.[^.]+$/, "").replace(/\\/g, "/")
      importedFiles.add(normalized)
    }
  }

  // Find files not imported anywhere
  for (const file of filesIndex) {
    const fileName = file.fileName.replace(/\.[^.]+$/, "").toLowerCase()
    const isEntryPoint = file.fileName.match(/^(main|index|app)\./i)
    
    if (!importedFiles.has(fileName) && !isEntryPoint) {
      results.push({
        type: "unused",
        path: file.path,
        fileName: file.fileName,
        snippet: "No incoming imports"
      })
    }
  }

  return results
}

// Search by dependency pattern (what imports what)
export function searchDependencies(query) {
  if (!query || !query.trim()) return []
  const q = query.toLowerCase()
  const results = []

  for (const file of filesIndex) {
    // Files that import the query
    for (const imp of file.imports) {
      if (imp.toLowerCase().includes(q)) {
        results.push({
          type: "dependency",
          path: file.path,
          realPath: file.realPath,
          fileName: file.fileName,
          snippet: `Imports: ${imp}`,
          direction: "imports"
        })
      }
    }

    // Files that are imported by the query
    const fileName = file.fileName.replace(/\.[^.]+$/, "").toLowerCase()
    if (fileName.includes(q)) {
      for (const otherFile of filesIndex) {
        for (const imp of otherFile.imports) {
          if (imp.toLowerCase().includes(fileName)) {
            results.push({
              type: "dependency",
              path: otherFile.path,
              realPath: otherFile.realPath,
              fileName: otherFile.fileName,
              snippet: `Imports: ${file.fileName}`,
              direction: "imported-by"
            })
          }
        }
      }
    }
  }

  return results
}