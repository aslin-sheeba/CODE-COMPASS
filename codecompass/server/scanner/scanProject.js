const fs = require("fs").promises
const path = require("path")
const { parseImports } = require("./parseImports")

const IGNORED_FOLDERS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage"
]

const VALID_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".html",
  ".json"
]

// 🔥 Normalize path (remove extension + fix slashes)
function normalizePath(p) {
  return p
    .replace(/\\/g, "/")
    .replace(/\.(ts|tsx|js|jsx|css|html|json)$/, "")
    .replace(/\/index$/, "")
}

// 🔥 Resolve relative import → absolute project path
function resolveImport(fromFile, importPath) {
  if (!importPath) return null

  // ignore external libs
  if (!importPath.startsWith(".")) return null

  const dir = path.dirname(fromFile)
  let resolved = path.resolve(dir, importPath)

  return normalizePath(resolved)
}

async function scanProject(directory, progressCallback = () => {}) {

  const results = []

  async function walk(currentDir) {

    let files

    try {
      files = await fs.readdir(currentDir)
    } catch (err) {
      return
    }

    for (const file of files) {

      if (IGNORED_FOLDERS.includes(file)) continue

      const fullPath = path.join(currentDir, file)

      let stat

      try {
        stat = await fs.stat(fullPath)
      } catch (err) {
        continue
      }

      if (stat.isDirectory()) {

        await walk(fullPath)

      } else {

        const ext = path.extname(file)

        if (!VALID_EXTENSIONS.includes(ext)) continue

        let content

        try {
          content = await fs.readFile(fullPath, "utf8")
        } catch (err) {
          continue
        }

        // 🔥 extract raw imports
        const rawImports = parseImports(content)

        // 🔥 resolve imports correctly
        const resolvedImports = rawImports
          .map(imp => resolveImport(fullPath, imp))
          .filter(Boolean)

        const lines = content.split("\n").length

        results.push({
          path: normalizePath(fullPath), // ✅ normalize file path too
          imports: resolvedImports,      // ✅ FIXED IMPORTS
          lines: lines,
          content: content
        })

        try {
          progressCallback({ processed: results.length, current: fullPath })
        } catch (e) {}
      }
    }
  }

  await walk(directory)

  return results
}

module.exports = { scanProject }

