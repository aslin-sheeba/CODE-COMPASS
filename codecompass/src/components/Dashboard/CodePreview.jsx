import React from "react"
import { useProjectStore } from "../../state/projectStore"
import Prism from "prismjs"
import "prismjs/themes/prism-tomorrow.css"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-tsx"
import "prismjs/components/prism-css"
import "prismjs/components/prism-markup"
import "prismjs/components/prism-json"

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getLang(path) {
  const ext = (path.match(/\.(\w+)$/) || [])[1] || ""
  const map = {
    js: "javascript", jsx: "jsx",
    ts: "typescript", tsx: "tsx",
    css: "css", html: "markup", json: "json"
  }
  return map[ext] || "javascript"
}

function getExtColor(path) {
  const ext = (path.match(/\.(\w+)$/) || [])[1] || "other"
  const map = {
    tsx: "#00e5ff", ts: "#3b82f6", jsx: "#06b6d4",
    js: "#ffb300", css: "#9c6fff", json: "#00e676",
    md: "#f97316", html: "#ef4444"
  }
  return map[ext] || "#4a5570"
}

function getStressColor(score) {
  if (score > 15) return "#ff4444"
  if (score > 8)  return "#ffb300"
  return "#00e676"
}

function getFileName(path) {
  return (path || "").replace(/\\/g, "/").split("/").pop()
}

function isExternal(imp) {
  return !imp.startsWith(".") && !imp.startsWith("/")
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 12, color: "#4a5570", padding: 40
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        border: "1px solid #1e2535",
        display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 22
      }}>
        📄
      </div>
      <div style={{ fontSize: 13, color: "#6b7a99", fontWeight: 600 }}>
        Select a file to preview
      </div>
      <div style={{
        fontSize: 11, fontFamily: "monospace",
        color: "#2e3d5a", textAlign: "center"
      }}>
        Click any file in the explorer to view its source,
        imports and metrics
      </div>
    </div>
  )
}

// ─── META BADGE ───────────────────────────────────────────────────────────────
function MetaBadge({ label, value, color }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", padding: "6px 14px",
      borderRight: "1px solid #1e2535", minWidth: 70
    }}>
      <div style={{
        fontSize: 9, textTransform: "uppercase",
        letterSpacing: "0.1em", color: "#4a5570",
        fontFamily: "monospace", marginBottom: 3
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 800,
        color, fontFamily: "monospace"
      }}>
        {value}
      </div>
    </div>
  )
}

// ─── IMPORT LIST ──────────────────────────────────────────────────────────────
function ImportList({ imports }) {
  const external = imports.filter(isExternal)
  const local    = imports.filter(i => !isExternal(i))

  if (imports.length === 0) {
    return (
      <div style={{
        padding: "10px 14px", fontSize: 11,
        color: "#4a5570", fontFamily: "monospace"
      }}>
        No imports
      </div>
    )
  }

  return (
    <div style={{ padding: "8px 0" }}>
      {external.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{
            padding: "3px 14px", fontSize: 9,
            textTransform: "uppercase", letterSpacing: "0.1em",
            color: "#2e3d5a", fontFamily: "monospace", marginBottom: 2
          }}>
            External ({external.length})
          </div>
          {external.map((imp, i) => (
            <div key={i} style={{
              padding: "4px 14px",
              display: "flex", alignItems: "center", gap: 8
            }}>
              <span style={{
                fontSize: 9, color: "#9c6fff", fontFamily: "monospace"
              }}>
                pkg
              </span>
              <span style={{
                fontSize: 11, color: "#8a95b0", fontFamily: "monospace",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}>
                {imp}
              </span>
            </div>
          ))}
        </div>
      )}
      {local.length > 0 && (
        <div>
          <div style={{
            padding: "3px 14px", fontSize: 9,
            textTransform: "uppercase", letterSpacing: "0.1em",
            color: "#2e3d5a", fontFamily: "monospace", marginBottom: 2
          }}>
            Local ({local.length})
          </div>
          {local.map((imp, i) => (
            <div key={i} style={{
              padding: "4px 14px",
              display: "flex", alignItems: "center", gap: 8
            }}>
              <span style={{
                fontSize: 9, color: "#00e5ff", fontFamily: "monospace"
              }}>
                rel
              </span>
              <span style={{
                fontSize: 11, color: "#8a95b0", fontFamily: "monospace",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}>
                {imp}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── INSIGHT CHIPS ────────────────────────────────────────────────────────────
function InsightChips({ file, usedBy }) {
  const chips = []
  const score = file._meta?.stressScore || 0

  if (score > 15)
    chips.push({ label: "Critical Stress",                        color: "#ff4444" })
  else if (score > 8)
    chips.push({ label: "Moderate Stress",                        color: "#ffb300" })
  if (usedBy.length >= 3)
    chips.push({ label: `Core Module (${usedBy.length})`,         color: "#00e5ff" })
  if (usedBy.length === 0 &&
    !file.path.includes("App.") &&
    !file.path.includes("main.") &&
    !file.path.includes("index."))
    chips.push({ label: "Possibly Unused",                        color: "#9c6fff" })
  if ((file.imports?.length || 0) > 5)
    chips.push({ label: "High Fan-Out",                           color: "#ffb300" })
  if (chips.length === 0)
    chips.push({ label: "Healthy Module",                         color: "#00e676" })

  return (
    <div style={{
      padding: "8px 12px", display: "flex",
      gap: 6, flexWrap: "wrap",
      borderTop: "1px solid #1e2535"
    }}>
      {chips.map((c, i) => (
        <div key={i} style={{
          padding: "2px 9px", borderRadius: 3,
          background: `${c.color}18`,
          border: `1px solid ${c.color}33`,
          fontSize: 9, color: c.color,
          fontFamily: "monospace", fontWeight: 700
        }}>
          {c.label}
        </div>
      ))}
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CodePreview() {
  const { files, selectedFile } = useProjectStore()
  const [tab, setTab] = React.useState("code")

  // ── ALL HOOKS MUST BE ABOVE ANY EARLY RETURN ──────────────────────────────
  React.useEffect(() => { setTab("code") }, [selectedFile?.path])

  // Syntax highlight — hook BEFORE early return
  const highlighted = React.useMemo(() => {
    if (!selectedFile) return ""
    const code = selectedFile.content || ""
    const lang = getLang(selectedFile.path)
    try {
      return Prism.highlight(
        code,
        Prism.languages[lang] || Prism.languages.javascript,
        lang
      )
    } catch {
      return code
    }
  }, [selectedFile?.path])

  // Used-by — computed BEFORE early return
  const usedBy = React.useMemo(() => {
    if (!selectedFile) return []
    return files.filter(f =>
      f.path !== selectedFile.path &&
      (f.imports || []).some(imp =>
        imp.includes(
          getFileName(selectedFile.path)
            .replace(/\.(tsx|ts|jsx|js)$/, "")
        )
      )
    )
  }, [selectedFile?.path, files])
  // ── END HOOKS ─────────────────────────────────────────────────────────────

  // Now safe to early return
  if (!selectedFile) return (
    <div style={{
      flex: 1, background: "#0e1117",
      border: "1px solid #1e2535", borderRadius: 8,
      display: "flex"
    }}>
      <EmptyState />
    </div>
  )

  const meta    = selectedFile._meta || {}
  const score   = meta.stressScore   || 0
  const imports = selectedFile.imports || []
  const color   = getExtColor(selectedFile.path)
  const ext     = (selectedFile.path.match(/\.(\w+)$/) || [])[1] || "?"

  const tabs = [
    { id: "code",    label: "Source" },
    { id: "imports", label: `Imports (${imports.length})` },
    { id: "usedby",  label: `Used By (${usedBy.length})` },
  ]

  return (
    <div style={{
      flex: 1, background: "#0e1117",
      border: "1px solid #1e2535", borderRadius: 8,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      height: "calc(100vh - 260px)", minHeight: 300
    }}>

      {/* FILE HEADER */}
      <div style={{
        padding: "10px 14px", borderBottom: "1px solid #1e2535",
        background: "#0a0c0f", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 10
      }}>
        <div style={{
          width: 30, height: 22, borderRadius: 4,
          background: `${color}18`, border: `1px solid ${color}44`,
          display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 8,
          fontFamily: "monospace", fontWeight: 700,
          color, flexShrink: 0
        }}>
          {ext}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: "#e8edf5",
            fontFamily: "monospace", overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap"
          }}>
            {getFileName(selectedFile.path)}
          </div>
          <div style={{
            fontSize: 9, color: "#2e3d5a", fontFamily: "monospace",
            marginTop: 1, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap"
          }}>
            {selectedFile.path}
          </div>
        </div>
        <div style={{
          padding: "3px 10px", borderRadius: 4,
          background: `${getStressColor(score)}18`,
          border: `1px solid ${getStressColor(score)}33`,
          fontSize: 10, fontFamily: "monospace",
          fontWeight: 700, color: getStressColor(score), flexShrink: 0
        }}>
          stress {score}
        </div>
      </div>

      {/* META ROW */}
      <div style={{
        display: "flex", borderBottom: "1px solid #1e2535",
        background: "#0a0c0f", flexShrink: 0
      }}>
        <MetaBadge label="Lines"    value={selectedFile.lines || "—"} color="#e8edf5" />
        <MetaBadge label="Imports"  value={imports.length}            color="#9c6fff" />
        <MetaBadge label="Incoming" value={meta.incoming || 0}        color="#00e5ff" />
        <MetaBadge label="Fan-Out"  value={meta.localImports || 0}    color="#ffb300" />
        <MetaBadge label="Stress"   value={score} color={getStressColor(score)} />
        <div style={{ flex: 1 }}>
          <InsightChips file={selectedFile} usedBy={usedBy} />
        </div>
      </div>

      {/* TABS */}
      <div style={{
        display: "flex", borderBottom: "1px solid #1e2535",
        background: "#0a0c0f", flexShrink: 0
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "7px 16px", background: "transparent", border: "none",
            borderBottom: `2px solid ${tab === t.id ? "#00e5ff" : "transparent"}`,
            color: tab === t.id ? "#00e5ff" : "#4a5570",
            fontSize: 11, fontFamily: "monospace",
            cursor: "pointer", transition: "all 0.15s"
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflow: "auto" }}>

        {tab === "code" && (
          <pre style={{
            margin: 0, padding: "14px 16px",
            fontSize: 11, lineHeight: 1.8,
            fontFamily: "monospace", background: "transparent"
          }}>
            <code
              dangerouslySetInnerHTML={{ __html: highlighted }}
              style={{ fontFamily: "monospace" }}
            />
          </pre>
        )}

        {tab === "imports" && <ImportList imports={imports} />}

        {tab === "usedby" && (
          <div style={{ padding: "8px 0" }}>
            {usedBy.length === 0 ? (
              <div style={{
                padding: "20px 14px", fontSize: 11,
                color: "#4a5570", fontFamily: "monospace"
              }}>
                No files import this module
              </div>
            ) : usedBy.map((f, i) => (
              <div key={i} style={{
                padding: "7px 14px",
                display: "flex", alignItems: "center",
                gap: 10, borderBottom: "1px solid #0e1117"
              }}>
                <div style={{
                  width: 24, height: 18, borderRadius: 3,
                  background: `${getExtColor(f.path)}18`,
                  border: `1px solid ${getExtColor(f.path)}44`,
                  display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 7,
                  fontFamily: "monospace", fontWeight: 700,
                  color: getExtColor(f.path), flexShrink: 0
                }}>
                  {(f.path.match(/\.(\w+)$/) || [])[1] || "?"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11, color: "#e8edf5",
                    fontFamily: "monospace", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap"
                  }}>
                    {getFileName(f.path)}
                  </div>
                  <div style={{
                    fontSize: 9, color: "#2e3d5a", fontFamily: "monospace"
                  }}>
                    {f.path}
                  </div>
                </div>
                <div style={{
                  fontSize: 10, fontFamily: "monospace",
                  color: getStressColor(f._meta?.stressScore || 0)
                }}>
                  {f._meta?.stressScore || 0}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}