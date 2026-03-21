import { create } from "zustand"

export const useProjectStore = create((set) => ({
  files: [],
  selectedFile: null,
  highlightedFile: null,

  setFiles: (files) => {
    // compute per-file metrics and incoming edges
    const filesWithMeta = files.map((f) => ({ ...f }))

    // build basename map for crude resolution
    const basenameMap = {}
    for (const f of filesWithMeta) {
      const name = f.path.replace(/\\/g, "/").split("/").pop()
      const base = name.replace(/\.(js|jsx|ts|tsx|css|html|json)$/, "")
      basenameMap[base] = basenameMap[base] || []
      basenameMap[base].push(f.path)
    }

    for (const f of filesWithMeta) {
      const imports = Array.isArray(f.imports) ? f.imports : []
      const uniqueImports = new Set(imports)
      const localImports = imports.filter(i => i.startsWith(".") || i.startsWith("/"))
      const externalImports = imports.length - localImports.length

      // crude incoming count: any import that contains the basename of this file
      let incoming = 0
      const myBasename = f.path.replace(/\\/g, "/").split("/").pop().replace(/\.(js|jsx|ts|tsx|css|html|json)$/, "")
      for (const other of filesWithMeta) {
        if (!other.imports) continue
        for (const imp of other.imports) {
          if (imp.includes(myBasename)) {
            incoming++
            break
          }
        }
      }

      // stress heuristic: base imports count weighted by local imports
      const importCount = imports.length
      const localRatio = importCount ? (localImports.length / importCount) : 0
      const stressScore = Math.round(importCount * (1 + localRatio * 0.6) + incoming * 0.5)

      f._meta = {
        importCount,
        uniqueImports: uniqueImports.size,
        localImports: localImports.length,
        externalImports,
        incoming,
        stressScore
      }
    }

    // sort files by stress descending
    filesWithMeta.sort((a, b) => (b._meta.stressScore || 0) - (a._meta.stressScore || 0))

    set({ files: filesWithMeta })
  },

  selectFile: (file) => set({ selectedFile: file }),
  setHighlightedFile: (file) => set({ highlightedFile: file })
}))