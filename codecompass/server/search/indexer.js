// server/search/indexer.js
// Server-side search index that complements client-side searchService.js.
// Builds an inverted token index and a trigram index for fuzzy matching.

/**
 * Build an inverted index: token → [{ path, line, col }]
 * Also builds a file-level path index for filename search.
 * @param {Array<{path:string,content?:string}>} files
 * @returns {{ tokens: object, paths: object, stats: object }}
 */
function buildServerIndex(files) {
  const tokens = {}   // token → [{path, line, col}]
  const paths  = {}   // filename-stem → [path]

  for (const file of files) {
    // Path index
    const stem = file.path.replace(/\\/g, "/").split("/").pop().replace(/\.[^.]+$/, "").toLowerCase()
    if (!paths[stem]) paths[stem] = []
    paths[stem].push(file.path)

    const content = file.content || ""
    const lines = content.split("\n")

    for (let i = 0; i < lines.length; i++) {
      const line   = lines[i]
      const toks   = line.toLowerCase().match(/[a-z_$][a-z0-9_$]*/g) || []
      const seen   = new Set()

      for (const tok of toks) {
        if (tok.length < 3 || seen.has(tok)) continue
        seen.add(tok)
        const col = line.toLowerCase().indexOf(tok)
        if (!tokens[tok]) tokens[tok] = []
        tokens[tok].push({ path: file.path, line: i + 1, col })
      }
    }
  }

  const stats = {
    files:  files.length,
    tokens: Object.keys(tokens).length,
    paths:  Object.keys(paths).length,
  }

  return { tokens, paths, stats }
}

/**
 * Search the server-side index.
 * Supports exact token match and filename match.
 * @param {{ tokens: object, paths: object }} index
 * @param {string} query
 * @returns {Array<{path:string, line?:number, col?:number, type:'token'|'path'}>}
 */
function searchIndex(index, query) {
  const q   = query.toLowerCase().trim()
  const out = []
  const seen = new Set()

  const add = (entry, type) => {
    const key = `${entry.path}:${entry.line || 0}`
    if (!seen.has(key)) { seen.add(key); out.push({ ...entry, type }) }
  }

  // Exact token match
  for (const hit of index.tokens[q] || []) add(hit, "token")

  // Path / filename match
  for (const [stem, paths] of Object.entries(index.paths || {})) {
    if (stem.includes(q)) paths.forEach(p => add({ path: p }, "path"))
  }

  // Prefix match on tokens (for partial queries)
  if (q.length >= 3 && !out.length) {
    for (const [tok, hits] of Object.entries(index.tokens)) {
      if (tok.startsWith(q)) hits.slice(0, 5).forEach(h => add(h, "token"))
    }
  }

  return out
}

module.exports = { buildServerIndex, searchIndex }
