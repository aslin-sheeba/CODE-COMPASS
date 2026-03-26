const fs   = require("fs").promises
const path = require("path")
const { parseImports } = require("./parseImports")

const IGNORED_FOLDERS = [
  "node_modules", ".git", "dist", "build", ".next", "coverage"
]

const VALID_EXTENSIONS = [
  ".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json"
]

// Manifest files that must keep their extension so DependencyLens can find them
const KEEP_EXTENSION = new Set([
  "package.json", "composer.json", "cargo.toml",
  "gemfile", "go.mod", "go.sum", "pipfile"
])

// Normalize path — strip extension for code files, keep for manifests
function normalizePath(p, filename) {
  const norm = p.replace(/\\/g, "/")
  const base = (filename || "").toLowerCase()

  // Keep extension for manifest files so DependencyLens can identify them
  if (KEEP_EXTENSION.has(base)) {
    return norm
  }

  return norm
    .replace(/\.(ts|tsx|js|jsx|css|html|json)$/, "")
    .replace(/\/index$/, "")
}

// Resolve relative import → absolute project path
function resolveImport(fromFile, importPath) {
  if (!importPath) return null
  if (!importPath.startsWith(".")) return null
  const dir      = path.dirname(fromFile)
  const resolved = path.resolve(dir, importPath)
  return normalizePath(resolved, "")
}

async function scanProject(directory, progressCallback = () => {}) {
  const results = []

  async function walk(currentDir) {
    let files
    try {
      files = await fs.readdir(currentDir)
    } catch { return }

    for (const file of files) {
      if (IGNORED_FOLDERS.includes(file)) continue

      const fullPath = path.join(currentDir, file)
      let stat
      try { stat = await fs.stat(fullPath) } catch { continue }

      if (stat.isDirectory()) {
        await walk(fullPath)
      } else {
        const ext      = path.extname(file)
        const baseLower = file.toLowerCase()

        // Include manifest files even without standard extensions (e.g. Gemfile)
        const isManifest = KEEP_EXTENSION.has(baseLower)
        if (!VALID_EXTENSIONS.includes(ext) && !isManifest) continue

        let content
        try { content = await fs.readFile(fullPath, "utf8") } catch { continue }

        const rawImports      = parseImports(content)
        const resolvedImports = rawImports
          .map(imp => resolveImport(fullPath, imp))
          .filter(Boolean)

        const lines    = content.split("\n").length
        const filePath = normalizePath(fullPath, file)

        results.push({
          path:    filePath,
          imports: resolvedImports,
          lines,
          content,
        })

        try { progressCallback({ processed: results.length, current: fullPath }) }
        catch {}
      }
    }
  }

  await walk(directory)
  return results
}

module.exports = { scanProject }