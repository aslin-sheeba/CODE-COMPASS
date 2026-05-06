// server/scanner/parseImports.js
// Extracts all import/require paths from JS/TS/JSX/TSX source content.

/**
 * Parse all import and require paths from source content.
 * Handles: ES6 import, dynamic import(), require(), export from
 * @param {string} content  Raw file content
 * @returns {string[]}       Array of import path strings
 */
function parseImports(content) {
  const imports = new Set()

  // ES6 static imports:  import ... from '...'
  // export re-exports:   export { x } from '...'
  const staticRe = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g
  let m
  while ((m = staticRe.exec(content)) !== null) {
    imports.add(m[1])
  }

  // Dynamic imports: import('...')  or import("...")
  const dynamicRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  while ((m = dynamicRe.exec(content)) !== null) {
    imports.add(m[1])
  }

  // CommonJS require: require('...')  or require("...")
  const requireRe = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  while ((m = requireRe.exec(content)) !== null) {
    imports.add(m[1])
  }

  return [...imports]
}

module.exports = { parseImports }
