import { create } from "zustand"

export const useProjectStore = create((set, get) => ({
  // ── Core data ───────────────────────────────────────────────────────────────
  files: [],
  selectedFile: null,
  highlightedFile: null,
  projectRoot: null,   // root folder path for git operations

  // ── Dependency rules (for DependencyLens) ──────────────────────────────────
  rules: [],

  // ── setFiles: compute metrics + build rules ─────────────────────────────────
  setFiles: (files) => {
    const filesWithMeta = files.map(f => ({ ...f }))

    // Detect project root from first file
    let projectRoot = null
    if (filesWithMeta.length > 0) {
      const firstPath = filesWithMeta[0].projectRoot || filesWithMeta[0].path || ""
      if (filesWithMeta[0].projectRoot) {
        projectRoot = filesWithMeta[0].projectRoot
      } else {
        // Walk up one level from first file path
        const parts = firstPath.replace(/\\/g, "/").split("/")
        projectRoot = parts.slice(0, -1).join("/") || firstPath
      }
    }

    // Build basename map for edge counting
    const basenameMap = {}
    for (const f of filesWithMeta) {
      const name = f.path.replace(/\\/g, "/").split("/").pop()
      const base = name.replace(/\.(js|jsx|ts|tsx|css|html|json)$/, "")
      basenameMap[base] = basenameMap[base] || []
      basenameMap[base].push(f.path)
    }

    // Compute per-file metrics
    for (const f of filesWithMeta) {
      const imports = Array.isArray(f.imports) ? f.imports : []
      const uniqueImports = new Set(imports)
      const localImports = imports.filter(i => i.startsWith(".") || i.startsWith("/"))
      const externalImports = imports.length - localImports.length

      let incoming = 0
      const myBasename = f.path.replace(/\\/g, "/").split("/").pop()
        .replace(/\.(js|jsx|ts|tsx|css|html|json)$/, "")
      for (const other of filesWithMeta) {
        if (!other.imports) continue
        for (const imp of other.imports) {
          if (imp.includes(myBasename)) { incoming++; break }
        }
      }

      const importCount = imports.length
      const localRatio = importCount ? (localImports.length / importCount) : 0
      const stressScore = Math.round(importCount * (1 + localRatio * 0.6) + incoming * 0.5)

      f._meta = {
        importCount, uniqueImports: uniqueImports.size,
        localImports: localImports.length, externalImports,
        incoming, stressScore
      }
    }

    filesWithMeta.sort((a, b) => (b._meta?.stressScore || 0) - (a._meta?.stressScore || 0))

    // Build dependency rules
    const rules = []
    filesWithMeta.forEach(file => {
      const imports = file.imports || []
      imports.forEach((imp, index) => {
        rules.push({
          id: file.path + "-" + index,
          source: file.path, target: imp,
          stress: imports.length > 5 ? "High" : imports.length > 2 ? "Medium" : "Low",
          status: imports.length > 5 ? "Critical" : imports.length > 2 ? "Warning" : "Active",
        })
      })
    })

    set({ files: filesWithMeta, projectRoot, rules })
  },

  selectFile: (file) => set({ selectedFile: file }),
  setHighlightedFile: (file) => set({ highlightedFile: file }),
  setProjectRoot: (root) => set({ projectRoot: root }),

  // ── Rule CRUD ───────────────────────────────────────────────────────────────
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
