import React from "react"

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_FILES = [
  {
    path: "src/App.jsx",
    imports: [
      "./services/projectService",
      "./state/projectStore",
      "./services/searchService",
      "./services/unusedService",
      "./services/riskService",
      "./components/ModuleGraph",
    ],
    _meta: { stressScore: 18, importCount: 6, incoming: 0 }
  },
  {
    path: "src/components/ModuleGraph.jsx",
    imports: ["d3-force", "../state/projectStore", "./GraphSearch"],
    _meta: { stressScore: 12, importCount: 3, incoming: 4 }
  },
  {
    path: "src/state/projectStore.js",
    imports: ["zustand"],
    _meta: { stressScore: 8, importCount: 1, incoming: 6 }
  },
  {
    path: "src/services/projectService.js",
    imports: [],
    _meta: { stressScore: 0, importCount: 0, incoming: 2 }
  },
  {
    path: "src/services/searchService.js",
    imports: [],
    _meta: { stressScore: 0, importCount: 0, incoming: 3 }
  },
  {
    path: "src/services/riskService.js",
    imports: [],
    _meta: { stressScore: 0, importCount: 0, incoming: 2 }
  },
  {
    path: "src/services/unusedService.js",
    imports: [],
    _meta: { stressScore: 0, importCount: 0, incoming: 1 }
  },
  {
    path: "src/components/Dashboard/StatsBar.jsx",
    imports: ["../../state/projectStore"],
    _meta: { stressScore: 3, importCount: 1, incoming: 1 }
  },
  {
    path: "src/components/Dashboard/FileExplorer.jsx",
    imports: ["react", "../../state/projectStore"],
    _meta: { stressScore: 4, importCount: 2, incoming: 1 }
  },
  {
    path: "src/components/Dashboard/CodePreview.jsx",
    imports: ["react", "../../state/projectStore", "prismjs"],
    _meta: { stressScore: 6, importCount: 3, incoming: 1 }
  },
]

const INITIAL_RULES = [
  { id: 1, module: "App.jsx",        dependency: "projectStore",   stress: "High",   status: "Active"   },
  { id: 2, module: "ModuleGraph.jsx", dependency: "d3-force",       stress: "Medium", status: "Active"   },
  { id: 3, module: "CodePreview.jsx", dependency: "prismjs",        stress: "Low",    status: "Active"   },
  { id: 4, module: "App.jsx",        dependency: "riskService",    stress: "Medium", status: "Warning"  },
  { id: 5, module: "services/api.ts", dependency: "axios",          stress: "Medium", status: "Critical" },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getName = (path) => (path || "").split(/[/\\]/).pop()

const getStressColor = (score) => {
  if (score > 15) return "#ff4444"
  if (score > 8)  return "#ffb300"
  return "#00e676"
}

const STRESS_OPTIONS = ["Low", "Medium", "High"]
const STATUS_OPTIONS = ["Active", "Warning", "Critical"]

const badgeStyle = (value) => {
  const map = {
    Low:      { bg: "#00e67618", color: "#00e676" },
    Medium:   { bg: "#ffb30018", color: "#ffb300" },
    High:     { bg: "#ff444418", color: "#ff4444" },
    Active:   { bg: "#00e67618", color: "#00e676" },
    Warning:  { bg: "#ffb30018", color: "#ffb300" },
    Critical: { bg: "#ff444418", color: "#ff4444" },
  }
  return map[value] || { bg: "#1e253518", color: "#6b7a99" }
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: "#111620", border: "1px solid #1e2535",
      borderRadius: 8, padding: "14px 20px", flex: 1,
      borderTop: `2px solid ${color}`
    }}>
      <div style={{ fontSize: 10, textTransform: "uppercase",
        letterSpacing: "0.12em", color: "#4a5570",
        fontFamily: "monospace", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

function FileSelector({ files, selected, onSelect }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase",
        letterSpacing: "0.12em", color: "#4a5570",
        fontFamily: "monospace", marginBottom: 8 }}>
        Select File to Inspect
      </div>
      <select
        value={selected?.path || ""}
        onChange={e => onSelect(files.find(f => f.path === e.target.value) || null)}
        style={{
          width: "100%", padding: "9px 12px",
          background: "#111620", border: "1px solid #1e2535",
          borderRadius: 6, color: "#e8edf5",
          fontFamily: "monospace", fontSize: 12,
          outline: "none", cursor: "pointer"
        }}
      >
        <option value="">— choose a file —</option>
        {files.map(f => (
          <option key={f.path} value={f.path}>{f.path}</option>
        ))}
      </select>
    </div>
  )
}

function FanPanel({ title, subtitle, color, items, emptyText }) {
  return (
    <div style={{
      flex: 1, background: "#111620",
      border: "1px solid #1e2535", borderRadius: 8, overflow: "hidden"
    }}>
      <div style={{ padding: "12px 16px",
        borderBottom: "1px solid #1e2535", background: "#0e1117" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>{title}</div>
        <div style={{ fontSize: 10, color: "#4a5570",
          fontFamily: "monospace", marginTop: 2 }}>
          {subtitle}
        </div>
      </div>
      <div style={{ padding: 8 }}>
        {items.length === 0 ? (
          <div style={{ padding: "12px 8px", fontSize: 12,
            color: "#4a5570", fontFamily: "monospace" }}>
            {emptyText}
          </div>
        ) : items.map((item, i) => (
          <div key={i} style={{
            padding: "8px 10px", borderRadius: 6, marginBottom: 4,
            background: "#0a0c0f", border: "1px solid #1e2535",
            display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 8
          }}>
            <div style={{ display: "flex", alignItems: "center",
              gap: 8, overflow: "hidden" }}>
              <span style={{ fontSize: 10, color,
                fontFamily: "monospace", flexShrink: 0 }}>
                {title.includes("Imports") ? "→" : "←"}
              </span>
              <span style={{ fontSize: 11, color: "#e8edf5",
                fontFamily: "monospace", overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.label}
              </span>
            </div>
            {item.score !== undefined && (
              <span style={{
                fontSize: 9, padding: "2px 7px", borderRadius: 3,
                flexShrink: 0,
                background: `${getStressColor(item.score)}18`,
                color: getStressColor(item.score),
                fontFamily: "monospace", fontWeight: 700
              }}>
                {item.score}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CenterCard({ file }) {
  const score = file._meta.stressScore
  const color = getStressColor(score)
  return (
    <div style={{
      width: 180, flexShrink: 0, background: "#111620",
      border: `1px solid ${color}44`, borderRadius: 8,
      padding: "16px 12px", display: "flex",
      flexDirection: "column", alignItems: "center", gap: 10,
      boxShadow: `0 0 20px ${color}18`
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 8,
        background: `${color}18`, border: `1px solid ${color}44`,
        display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 18
      }}>📄</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#e8edf5",
        fontFamily: "monospace", textAlign: "center",
        wordBreak: "break-all" }}>
        {getName(file.path)}
      </div>
      <div style={{
        fontSize: 10, padding: "3px 10px", borderRadius: 4,
        background: `${color}18`, color,
        fontFamily: "monospace", fontWeight: 700
      }}>
        stress: {score}
      </div>
      <div style={{ fontSize: 10, color: "#4a5570",
        fontFamily: "monospace", textAlign: "center" }}>
        {file.imports.length} imports<br />{file._meta.incoming} incoming
      </div>
    </div>
  )
}

function RiskMetrics({ file, fanIn, fanOut }) {
  const score = file._meta.stressScore
  const color = getStressColor(score)
  const metrics = [
    { label: "Fan-Out", desc: "modules this file imports",
      value: fanOut.length, max: 10, color: "#00e5ff" },
    { label: "Fan-In",  desc: "modules that import this file",
      value: fanIn.length,  max: 10, color: "#00e676" },
    { label: "Stress",  desc: "weighted coupling complexity",
      value: score,         max: 20, color },
  ]
  return (
    <div style={{ background: "#111620", border: "1px solid #1e2535",
      borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "12px 16px",
        borderBottom: "1px solid #1e2535", background: "#0e1117" }}>
        <div style={{ fontSize: 13, fontWeight: 700,
          color: "#e8edf5" }}>Risk Metrics</div>
        <div style={{ fontSize: 10, color: "#4a5570",
          fontFamily: "monospace", marginTop: 2 }}>
          coupling analysis for {getName(file.path)}
        </div>
      </div>
      <div style={{ padding: "12px 16px",
        display: "flex", flexDirection: "column", gap: 14 }}>
        {metrics.map(m => (
          <div key={m.label}>
            <div style={{ display: "flex",
              justifyContent: "space-between",
              alignItems: "center", marginBottom: 5 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600,
                  color: "#e8edf5" }}>{m.label}</span>
                <span style={{ fontSize: 10, color: "#4a5570",
                  fontFamily: "monospace", marginLeft: 8 }}>
                  {m.desc}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800,
                color: m.color, fontFamily: "monospace" }}>
                {m.value}
              </span>
            </div>
            <div style={{ height: 6, background: "#0a0c0f",
              borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3, background: m.color,
                width: `${Math.min((m.value / m.max) * 100, 100)}%`,
                transition: "width 0.5s ease",
                boxShadow: `0 0 6px ${m.color}88`
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Insights({ file, fanIn, fanOut }) {
  const insights = []
  if (fanOut.length > 5)
    insights.push({ level: "warning", icon: "⚠️", title: "High Fan-Out",
      desc: `Imports ${fanOut.length} modules. Consider splitting responsibilities.` })
  if (fanIn.length === 0 && !file.path.includes("App.") &&
    !file.path.includes("main.") && !file.path.includes("index."))
    insights.push({ level: "error", icon: "🚨", title: "Possibly Unused",
      desc: "No other file imports this module. It may be dead code." })
  if (fanIn.length >= 3)
    insights.push({ level: "info", icon: "🔥", title: "Core Module",
      desc: `Used by ${fanIn.length} files. Changes here will have wide impact.` })
  if (file._meta.stressScore > 15)
    insights.push({ level: "error", icon: "🔴", title: "Critical Stress",
      desc: "Stress score is very high. This file is a refactoring priority." })
  if (file._meta.stressScore > 8 && file._meta.stressScore <= 15)
    insights.push({ level: "warning", icon: "🟡", title: "Moderate Stress",
      desc: "Stress score is elevated. Monitor coupling as the project grows." })
  if (insights.length === 0)
    insights.push({ level: "success", icon: "✅", title: "Healthy Module",
      desc: "No coupling issues detected. This file looks good." })

  const levelColor = { error: "#ff4444", warning: "#ffb300",
    info: "#00e5ff", success: "#00e676" }

  return (
    <div style={{ background: "#111620", border: "1px solid #1e2535",
      borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px",
        borderBottom: "1px solid #1e2535", background: "#0e1117" }}>
        <div style={{ fontSize: 13, fontWeight: 700,
          color: "#e8edf5" }}>Insights</div>
        <div style={{ fontSize: 10, color: "#4a5570",
          fontFamily: "monospace", marginTop: 2 }}>
          auto-generated analysis for {getName(file.path)}
        </div>
      </div>
      <div style={{ padding: "10px 12px",
        display: "flex", flexDirection: "column", gap: 8 }}>
        {insights.map((ins, i) => (
          <div key={i} style={{
            padding: "10px 12px", borderRadius: 6,
            background: "#0a0c0f",
            border: `1px solid ${levelColor[ins.level]}33`,
            borderLeft: `3px solid ${levelColor[ins.level]}`,
            display: "flex", gap: 10, alignItems: "flex-start"
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{ins.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700,
                color: levelColor[ins.level], marginBottom: 2 }}>
                {ins.title}
              </div>
              <div style={{ fontSize: 11, color: "#8a95b0",
                lineHeight: 1.5 }}>
                {ins.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function RuleModal({ rule, onSave, onClose }) {
  const [form, setForm] = React.useState(
    rule || { module: "", dependency: "", stress: "Low", status: "Active" }
  )

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const inputStyle = {
    width: "100%", padding: "8px 12px",
    background: "#0a0c0f", border: "1px solid #1e2535",
    borderRadius: 6, color: "#e8edf5",
    fontFamily: "monospace", fontSize: 12,
    outline: "none", boxSizing: "border-box"
  }

  const labelStyle = {
    fontSize: 10, textTransform: "uppercase",
    letterSpacing: "0.1em", color: "#4a5570",
    fontFamily: "monospace", marginBottom: 5,
    display: "block"
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, backdropFilter: "blur(3px)"
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#111620", border: "1px solid #2e3d5a",
        borderRadius: 12, padding: 24, width: 400
      }}>
        {/* Modal header */}
        <div style={{ fontSize: 15, fontWeight: 700,
          color: "#e8edf5", marginBottom: 20 }}>
          {rule ? "Edit Rule" : "Add Dependency Rule"}
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Module</label>
            <input style={inputStyle} placeholder="e.g. Dashboard.jsx"
              value={form.module}
              onChange={e => set("module", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Dependency</label>
            <input style={inputStyle} placeholder="e.g. react-router-dom"
              value={form.dependency}
              onChange={e => set("dependency", e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Stress Level</label>
              <select style={inputStyle} value={form.stress}
                onChange={e => set("stress", e.target.value)}>
                {STRESS_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={form.status}
                onChange={e => set("status", e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end",
          gap: 8, marginTop: 22 }}>
          <button onClick={onClose} style={{
            padding: "7px 16px", borderRadius: 6, border: "1px solid #1e2535",
            background: "transparent", color: "#8a95b0",
            cursor: "pointer", fontSize: 12
          }}>
            Cancel
          </button>
          <button
            onClick={() => {
              if (!form.module.trim() || !form.dependency.trim()) return
              onSave(form)
            }}
            style={{
              padding: "7px 16px", borderRadius: 6, border: "none",
              background: "#00e5ff", color: "#0a0c0f",
              cursor: "pointer", fontSize: 12, fontWeight: 700
            }}
          >
            {rule ? "Save Changes" : "Add Rule"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CRUD TABLE ───────────────────────────────────────────────────────────────
function RulesTable() {
  const [rules, setRules]       = React.useState(INITIAL_RULES)
  const [search, setSearch]     = React.useState("")
  const [modal, setModal]       = React.useState(false)
  const [editing, setEditing]   = React.useState(null)
  const [deleting, setDeleting] = React.useState(null)

  const filtered = rules.filter(r =>
    r.module.toLowerCase().includes(search.toLowerCase()) ||
    r.dependency.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd  = () => { setEditing(null); setModal(true) }
  const openEdit = (r) => { setEditing(r);   setModal(true) }

  const handleSave = (form) => {
    if (editing) {
      setRules(p => p.map(r =>
        r.id === editing.id ? { ...r, ...form } : r
      ))
    } else {
      setRules(p => [...p, { id: Date.now(), ...form }])
    }
    setModal(false)
    setEditing(null)
  }

  const handleDelete = (id) => {
    setRules(p => p.filter(r => r.id !== id))
    setDeleting(null)
  }

  const thStyle = {
    padding: "9px 14px", textAlign: "left",
    fontFamily: "monospace", fontSize: 9,
    textTransform: "uppercase", letterSpacing: "0.1em",
    color: "#4a5570", borderBottom: "1px solid #1e2535",
    fontWeight: 400
  }

  const tdStyle = {
    padding: "10px 14px", borderBottom: "1px solid #1e2535",
    fontSize: 12, color: "#8a95b0"
  }

  return (
    <>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700,
            color: "#e8edf5", marginBottom: 2 }}>
            Dependency Rules
          </div>
          <div style={{ fontSize: 10, color: "#4a5570",
            fontFamily: "monospace" }}>
            manually track and audit dependency relationships
          </div>
        </div>
        <button onClick={openAdd} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 16px", borderRadius: 6, border: "none",
          background: "#00e5ff", color: "#0a0c0f",
          cursor: "pointer", fontSize: 12, fontWeight: 700
        }}>
          + Add Rule
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 10,
          top: "50%", transform: "translateY(-50%)",
          color: "#4a5570", fontSize: 12 }}>🔍</span>
        <input
          placeholder="Filter by module or dependency..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "8px 12px 8px 32px",
            background: "#111620", border: "1px solid #1e2535",
            borderRadius: 6, color: "#e8edf5",
            fontFamily: "monospace", fontSize: 12,
            outline: "none", boxSizing: "border-box"
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: "#111620", border: "1px solid #1e2535",
        borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#0e1117" }}>
            <tr>
              <th style={thStyle}>Module</th>
              <th style={thStyle}>Dependency</th>
              <th style={thStyle}>Stress</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, textAlign: "center",
                  padding: 32, color: "#4a5570", fontFamily: "monospace" }}>
                  No rules match your search
                </td>
              </tr>
            ) : filtered.map(r => {
              const s  = badgeStyle(r.stress)
              const st = badgeStyle(r.status)
              return (
                <tr key={r.id} style={{ transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#171e2c"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ ...tdStyle, color: "#e8edf5",
                    fontFamily: "monospace", fontWeight: 600 }}>
                    {r.module}
                  </td>
                  <td style={{ ...tdStyle, color: "#00e5ff",
                    fontFamily: "monospace" }}>
                    {r.dependency}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 3,
                      fontSize: 10, fontWeight: 700,
                      fontFamily: "monospace",
                      background: s.bg, color: s.color
                    }}>
                      {r.stress}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 3,
                      fontSize: 10, fontWeight: 700,
                      fontFamily: "monospace",
                      background: st.bg, color: st.color
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(r)} style={{
                        padding: "4px 10px", borderRadius: 4,
                        border: "1px solid #1e2535",
                        background: "transparent", color: "#8a95b0",
                        cursor: "pointer", fontSize: 11
                      }}>
                        Edit
                      </button>
                      <button onClick={() => setDeleting(r.id)} style={{
                        padding: "4px 10px", borderRadius: 4,
                        border: "1px solid #ff444422",
                        background: "#ff444410", color: "#ff4444",
                        cursor: "pointer", fontSize: 11
                      }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Record count */}
      <div style={{ marginTop: 8, fontSize: 10, color: "#4a5570",
        fontFamily: "monospace" }}>
        {filtered.length} of {rules.length} rules
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <RuleModal
          rule={editing}
          onSave={handleSave}
          onClose={() => { setModal(false); setEditing(null) }}
        />
      )}

      {/* Delete confirm */}
      {deleting && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, backdropFilter: "blur(3px)"
        }}>
          <div style={{ background: "#111620",
            border: "1px solid #ff444444",
            borderRadius: 12, padding: 24, width: 360 }}>
            <div style={{ fontSize: 15, fontWeight: 700,
              color: "#e8edf5", marginBottom: 8 }}>
              Delete Rule?
            </div>
            <div style={{ fontSize: 12, color: "#8a95b0",
              marginBottom: 20 }}>
              This action cannot be undone.
            </div>
            <div style={{ display: "flex",
              justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setDeleting(null)} style={{
                padding: "7px 16px", borderRadius: 6,
                border: "1px solid #1e2535", background: "transparent",
                color: "#8a95b0", cursor: "pointer", fontSize: 12
              }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleting)} style={{
                padding: "7px 16px", borderRadius: 6, border: "none",
                background: "#ff4444", color: "#fff",
                cursor: "pointer", fontSize: 12, fontWeight: 700
              }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function DependencyLens() {
  const [selected, setSelected] = React.useState(null)

  const totalDeps  = MOCK_FILES.reduce((acc, f) => acc + f.imports.length, 0)
  const highStress = MOCK_FILES.filter(f => f._meta.stressScore > 10).length
  const critical   = MOCK_FILES.filter(f => f._meta.stressScore > 15).length
  const unused     = MOCK_FILES.filter(f =>
    f._meta.incoming === 0 &&
    !f.path.includes("App.") &&
    !f.path.includes("main.")
  ).length

  const fanOut = selected
    ? selected.imports.map(imp => ({ label: imp, score: undefined }))
    : []

  const fanIn = selected
    ? MOCK_FILES
        .filter(f =>
          f.path !== selected.path &&
          f.imports.some(imp =>
            imp.includes(getName(selected.path)
              .replace(/\.(jsx|tsx|js|ts)$/, ""))
          )
        )
        .map(f => ({ label: f.path, score: f._meta.stressScore }))
    : []

  return (
    <div style={{ padding: 24, background: "#0a0c0f",
      minHeight: "100%", color: "#e8edf5" }}>

      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700,
          margin: 0, marginBottom: 4 }}>
          Dependency Lens
        </h2>
        <div style={{ fontSize: 11, color: "#4a5570",
          fontFamily: "monospace" }}>
          // inspect module relationships, coupling & risk
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        <StatCard label="Total Dependencies" value={totalDeps}  color="#00e5ff" />
        <StatCard label="High Stress Files"  value={highStress} color="#ffb300" />
        <StatCard label="Critical Files"     value={critical}   color="#ff4444" />
        <StatCard label="Unused Files"       value={unused}     color="#9c6fff" />
      </div>

      {/* FILE SELECTOR */}
      <FileSelector
        files={MOCK_FILES}
        selected={selected}
        onSelect={setSelected}
      />

      {/* FAN PANELS */}
      {selected ? (
        <>
          <div style={{ display: "flex", gap: 16,
            alignItems: "flex-start", marginBottom: 20 }}>
            <FanPanel
              title="← Used By"
              subtitle="files that import this module"
              color="#00e676"
              items={fanIn}
              emptyText="No files import this module"
            />
            <CenterCard file={selected} />
            <FanPanel
              title="→ Imports"
              subtitle="modules this file depends on"
              color="#00e5ff"
              items={fanOut}
              emptyText="This file has no imports"
            />
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
            <div style={{ flex: 1 }}>
              <RiskMetrics file={selected} fanIn={fanIn} fanOut={fanOut} />
            </div>
            <div style={{ flex: 1 }}>
              <Insights file={selected} fanIn={fanIn} fanOut={fanOut} />
            </div>
          </div>
        </>
      ) : (
        <div style={{
          border: "1px dashed #1e2535", borderRadius: 8,
          padding: 40, textAlign: "center", marginBottom: 32,
          color: "#4a5570", fontFamily: "monospace", fontSize: 12
        }}>
          ↑ Select a file above to inspect its dependency relationships
        </div>
      )}

      {/* DIVIDER */}
      <div style={{ height: 1, background: "#1e2535", marginBottom: 28 }} />

      {/* CRUD TABLE */}
      <RulesTable />

    </div>
  )
}