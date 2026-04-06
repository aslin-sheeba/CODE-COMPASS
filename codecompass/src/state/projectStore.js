import { create } from "zustand"

export const useProjectStore = create((set, get) => ({
  files: [],
  selectedFile: null,
  highlightedFile: null,
  projectRoot: null,
  rules: [],

  setFiles: (files) => {
    const filesWithMeta = files.map(f => ({ ...f }))

    // Detect project root
    let projectRoot = null
    if (filesWithMeta.length > 0) {
      const first = filesWithMeta[0]
      if (first.projectRoot) {
        projectRoot = first.projectRoot
      } else {
        const parts = (first.path || "").replace(/\\/g, "/").split("/")
        projectRoot = parts.slice(0, -1).join("/") || first.path
      }
    }

    // O(n) incoming count — build reverse index first
    const incomingCount = {}
    for (const f of filesWithMeta) {
      const myBase = f.path.replace(/\\/g, "/").split("/").pop()
        .replace(/\.(js|jsx|ts|tsx|css|html|json)$/, "")
      incomingCount[myBase] = 0
    }
    for (const f of filesWithMeta) {
      if (!f.imports) continue
      const seen = new Set()
      for (const imp of f.imports) {
        const seg = imp.replace(/\\/g, "/").split("/").pop()
          .replace(/\.(js|jsx|ts|tsx|css|html|json)$/, "")
        if (!seen.has(seg) && seg in incomingCount) {
          incomingCount[seg]++
          seen.add(seg)
        }
      }
    }

    // Per-file metrics
    for (const f of filesWithMeta) {
      const imports         = Array.isArray(f.imports) ? f.imports : []
      const uniqueImports   = new Set(imports)
      const localImports    = imports.filter(i => i.startsWith(".") || i.startsWith("/"))
      const externalImports = imports.length - localImports.length

      const myBase      = f.path.replace(/\\/g, "/").split("/").pop()
        .replace(/\.(js|jsx|ts|tsx|css|html|json)$/, "")
      const incoming    = incomingCount[myBase] ?? 0
      const importCount = imports.length
      const localRatio  = importCount ? localImports.length / importCount : 0
      const stressScore = Math.round(importCount * (1 + localRatio * 0.6) + incoming * 0.5)

      f._meta = {
        importCount, uniqueImports: uniqueImports.size,
        localImports: localImports.length, externalImports,
        incoming, stressScore,
      }
    }

    filesWithMeta.sort((a, b) => (b._meta?.stressScore || 0) - (a._meta?.stressScore || 0))

    const rules = []
    for (const file of filesWithMeta) {
      const imports = file.imports || []
      for (let index = 0; index < imports.length; index++) {
        rules.push({
          id:     `${file.path}-${index}`,
          source: file.path,
          target: imports[index],
          stress: imports.length > 5 ? "High"    : imports.length > 2 ? "Medium" : "Low",
          status: imports.length > 5 ? "Critical": imports.length > 2 ? "Warning": "Active",
        })
      }
    }

    set({ files: filesWithMeta, projectRoot, rules })
  },

  selectFile:         (file) => set({ selectedFile: file }),
  setHighlightedFile: (file) => set({ highlightedFile: file }),
  setProjectRoot:     (root) => set({ projectRoot: root }),

  addRule: (rule) => {
    set({ rules: [...get().rules, { ...rule, id: Date.now().toString() }] })
  },
  updateRule: (id, updatedRule) => {
    set({ rules: get().rules.map(r => r.id === id ? { ...r, ...updatedRule } : r) })
  },
  deleteRule: (id) => {
    set({ rules: get().rules.filter(r => r.id !== id) })
  },
}))