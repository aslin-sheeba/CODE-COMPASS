function parseImports(content) {
  const regex = /import\s.*?from\s['"](.*?)['"]/g
  const imports = []

  let match

  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1])
  }

  return imports
}

module.exports = { parseImports }