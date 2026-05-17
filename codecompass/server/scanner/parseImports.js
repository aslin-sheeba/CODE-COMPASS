// server/scanner/parseImports.js  (V2 — multi-language)
// Extracts import/require/use paths from JS, TS, JSX, TSX, Python, Rust, Go,
// Ruby, Java, Kotlin.  CRLF-safe: content is normalised before matching.

function parseImports(content, ext) {
  if (!content) return []
  const src     = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const imports = new Set()

  // ── JavaScript / TypeScript / JSX / TSX ──────────────────────────────────
  if (!ext || /^[jt]sx?$/.test(ext)) {
    const staticRe = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g
    let m
    while ((m = staticRe.exec(src)) !== null) imports.add(m[1])
    const dynRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    while ((m = dynRe.exec(src)) !== null) imports.add(m[1])
    const reqRe = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    while ((m = reqRe.exec(src)) !== null) imports.add(m[1])
  }

  // ── Python ───────────────────────────────────────────────────────────────
  if (!ext || ext === "py") {
    const impRe  = /^\s*import\s+([\w.]+)/gm
    const fromRe = /^\s*from\s+([\w.]+)\s+import/gm
    let m
    while ((m = impRe.exec(src))  !== null) imports.add(m[1].split(".")[0])
    while ((m = fromRe.exec(src)) !== null) {
      const pkg = m[1].replace(/^\.+/, "")
      if (pkg) imports.add(pkg.split(".")[0])
    }
  }

  // ── Rust ─────────────────────────────────────────────────────────────────
  if (!ext || ext === "rs") {
    const useRe = /^\s*use\s+([\w:]+)/gm
    const extRe = /^\s*extern\s+crate\s+(\w+)/gm
    let m
    while ((m = useRe.exec(src)) !== null) {
      const c = m[1].split("::")[0]
      if (c !== "self" && c !== "super") imports.add(c)
    }
    while ((m = extRe.exec(src)) !== null) imports.add(m[1])
  }

  // ── Go ───────────────────────────────────────────────────────────────────
  if (!ext || ext === "go") {
    const impRe = /import\s+(?:"([^"]+)"|`([^`]+)`|\(([^)]+)\))/gs
    let m
    while ((m = impRe.exec(src)) !== null) {
      const block = m[1] || m[2] || m[3] || ""
      const pkgRe = /"([^"]+)"|`([^`]+)`/g
      let pm
      while ((pm = pkgRe.exec(block)) !== null)
        imports.add((pm[1] || pm[2]).split("/").pop())
    }
  }

  // ── Ruby ─────────────────────────────────────────────────────────────────
  if (!ext || ext === "rb") {
    const reqRe = /\brequire(?:_relative)?\s+['"]([^'"]+)['"]/g
    let m
    while ((m = reqRe.exec(src)) !== null) imports.add(m[1])
  }

  // ── Java / Kotlin ─────────────────────────────────────────────────────────
  if (!ext || /^(java|kt|kts)$/.test(ext)) {
    const impRe = /^\s*import\s+(?:static\s+)?([\w.]+)(?:\.\*)?;?/gm
    let m
    while ((m = impRe.exec(src)) !== null) {
      const parts = m[1].split(".")
      if (parts.length >= 2) imports.add(`${parts[0]}.${parts[1]}`)
    }
  }

  return [...imports]
}

module.exports = { parseImports }
