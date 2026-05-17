// server/scanner/scanProject.js  (V2 — multi-language)
const fs   = require("fs").promises
const path = require("path")
const { parseImports } = require("./parseImports")

const IGNORED_FOLDERS   = ["node_modules", ".git", "dist", "build", ".next", "coverage", "__pycache__", "target", "vendor"]
const VALID_EXTENSIONS  = [".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json",
                           ".py", ".rs", ".go", ".rb", ".java", ".kt", ".kts"]
const KEEP_EXTENSION    = new Set(["package.json", "composer.json", "cargo.toml", "gemfile", "go.mod", "go.sum", "pipfile"])
const MAX_CONTENT_BYTES = 200 * 1024   // 200 KB

function normalizePath(p, filename) {
  const norm = p.replace(/\\/g, "/")
  const base = (filename || "").toLowerCase()
  if (KEEP_EXTENSION.has(base)) return norm
  return norm
    .replace(/\.(ts|tsx|js|jsx|css|html|json|py|rs|go|rb|java|kt|kts)$/, "")
    .replace(/\/index$/, "")
}

function resolveImport(fromFile, importPath) {
  if (!importPath || !importPath.startsWith(".")) return null
  const resolved = path.resolve(path.dirname(fromFile), importPath)
  return normalizePath(resolved, "")
}

async function scanProject(directory, progressCallback = () => {}) {
  const results = []

  async function walk(currentDir) {
    let entries
    try { entries = await fs.readdir(currentDir) } catch { return }

    for (const file of entries) {
      if (IGNORED_FOLDERS.includes(file)) continue

      const fullPath = path.join(currentDir, file)
      let stat
      try { stat = await fs.stat(fullPath) } catch { continue }

      if (stat.isDirectory()) { await walk(fullPath); continue }

      const ext       = path.extname(file)          // e.g. ".py"
      const extRaw    = ext.slice(1)                // e.g. "py"
      const baseLower = file.toLowerCase()
      const isManifest = KEEP_EXTENSION.has(baseLower)

      if (!VALID_EXTENSIONS.includes(ext) && !isManifest) continue
      if (stat.size > MAX_CONTENT_BYTES) continue

      let content
      try { content = await fs.readFile(fullPath, "utf8") } catch { continue }

      const rawImports      = parseImports(content, extRaw)
      const resolvedImports = rawImports.map(imp => resolveImport(fullPath, imp)).filter(Boolean)
      const lines           = content.split("\n").length
      const filePath        = normalizePath(fullPath, file)
      const realPath        = fullPath.replace(/\\/g, "/")

      results.push({
        path:     filePath,
        realPath: realPath,
        imports:  resolvedImports,
        lines,
        content,
        ext:      extRaw,
      })

      try { progressCallback({ processed: results.length, current: fullPath }) } catch {}
    }
  }

  await walk(directory)
  return results
}

module.exports = { scanProject }
