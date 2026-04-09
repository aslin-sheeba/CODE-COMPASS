// indexer.js — server-side search index (complements client-side searchService.js)
// Builds an inverted index from scanned files for full-text search.

/**
 * Build an inverted index: token → [{ path, line }]
 */
function buildServerIndex(files) {
  const index = {}
  for (const file of files) {
    const lines = (file.content||"").split("\n")
    for (let i = 0; i < lines.length; i++) {
      const tokens = lines[i].toLowerCase().match(/[a-z_$][a-z0-9_$]*/g) || []
      for (const token of tokens) {
        if (token.length < 3) continue
        if (!index[token]) index[token] = []
        index[token].push({ path: file.path, line: i+1 })
      }
    }
  }
  return index
}

/**
 * Search the server-side index.
 */
function searchIndex(index, query) {
  const token = query.toLowerCase().trim()
  return index[token] || []
}

module.exports = { buildServerIndex, searchIndex }
