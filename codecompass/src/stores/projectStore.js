import { create } from "zustand"

export const useProjectStore = create((set, get) => ({
  // 📁 CORE DATA
  files: [],
  selectedFile: null,

  // 🔗 DEPENDENCY RULES
  rules: [],

  // -----------------------------
  // 📁 FILE ACTIONS
  // -----------------------------
  setFiles: (files) => {
    set({ files })

    // 🔥 AUTO GENERATE RULES
    const rules = []

    files.forEach((file) => {
      const imports = file.imports || []

      imports.forEach((imp, index) => {
        rules.push({
          id: file.path + "-" + index,
          source: file.path,
          target: imp,

          // simple defaults
          stress:
            imports.length > 5
              ? "High"
              : imports.length > 2
              ? "Medium"
              : "Low",

          status:
            imports.length > 5
              ? "Critical"
              : imports.length > 2
              ? "Warning"
              : "Active",
        })
      })
    })

    set({ rules })
  },

  selectFile: (file) => set({ selectedFile: file }),

  // -----------------------------
  // 🔗 RULE CRUD
  // -----------------------------

  addRule: (rule) => {
    const current = get().rules
    set({
      rules: [
        ...current,
        {
          ...rule,
          id: Date.now().toString(),
        },
      ],
    })
  },

  updateRule: (id, updatedRule) => {
    const current = get().rules

    const updated = current.map((r) =>
      r.id === id ? { ...r, ...updatedRule } : r
    )

    set({ rules: updated })
  },

  deleteRule: (id) => {
    const current = get().rules
    set({
      rules: current.filter((r) => r.id !== id),
    })
  },
}))