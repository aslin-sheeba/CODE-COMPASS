import React from "react"
import { useProjectStore } from "../../state/projectStore"

// ─── HELPERS ──────────────────────────────────────────────────────────────────
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

function getStressLabel(score) {
  if (score > 15) return "critical"
  if (score > 8)  return "medium"
  return "low"
}

function getFileName(path) {
  return (path || "").replace(/\\/g, "/").split("/").pop()
}

function getFilePath(path) {
  const parts = (path || "").replace(/\\/g, "/").split("/")
  return parts.slice(0, -1).join("/")
}

// ─── FILE ROW ─────────────────────────────────────────────────────────────────
function FileRow({ file, isSelected, onClick }) {
  const [hovered, setHovered] = React.useState(false)
  const stress  = file._meta?.stressScore || 0
  const imports = file.imports?.length    || 0
  const color   = getExtColor(file.path)
  const ext     = (file.path.match(/\.(\w+)$/) || [])[1] || "?"

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "8px 12px",
        display: "flex", alignItems: "center", gap: 10,
        cursor: "pointer", borderLeft: "2px solid transparent",
        transition: "all 0.1s",
        background: isSelected
          ? "#00e5ff0a"
          : hovered ? "#0e1117" : "transparent",
        borderLeftColor: isSelected ? "#00e5ff" : "transparent",
      }}
    >
      {/* Extension badge */}
      <div style={{
        width: 28, height: 20, borderRadius: 3,
        background: `${color}18`,
        border: `1px solid ${color}44`,
        display: "flex", alignItems: "center",
        justifyContent: "center",
        fontSize: 8, fontFamily: "monospace",
        fontWeight: 700, color, flexShrink: 0
      }}>
        {ext}
      </div>

      {/* File name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontFamily: "monospace",
          color: isSelected ? "#00e5ff" : "#e8edf5",
          overflow: "hidden", textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}>
          {getFileName(file.path)}
        </div>
        <div style={{
          fontSize: 9, color: "#2e3d5a",
          fontFamily: "monospace", marginTop: 1,
          overflow: "hidden", textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}>
          {getFilePath(file.path)}
        </div>
      </div>

      {/* Import count */}
      <div style={{
        fontSize: 9, fontFamily: "monospace",
        color: "#4a5570", flexShrink: 0
      }}>
        {imports}i
      </div>

      {/* Stress dot */}
      <div style={{
        width: 7, height: 7, borderRadius: "50%",
        background: getStressColor(stress),
        flexShrink: 0,
        boxShadow: stress > 8
          ? `0 0 4px ${getStressColor(stress)}` : "none"
      }} />
    </div>
  )
}

// ─── SORT CONTROL ─────────────────────────────────────────────────────────────
function SortButton({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "3px 8px", borderRadius: 4, border: "1px solid",
      borderColor: active ? "#00e5ff44" : "#1e2535",
      background: active ? "#00e5ff0a" : "transparent",
      color: active ? "#00e5ff" : "#4a5570",
      fontSize: 9, fontFamily: "monospace",
      cursor: "pointer", transition: "all 0.15s"
    }}>
      {label}
    </button>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function FileExplorer() {
  const { files, selectedFile, selectFile } = useProjectStore()

  const [filter,     setFilter]     = React.useState("")
  const [lang,       setLang]       = React.useState("all")
  const [sort,       setSort]       = React.useState("stress")
  const [stressOnly, setStressOnly] = React.useState(false)

  // Unique extensions
  const langs = ["all", ...Array.from(
    new Set(files.map(f => (f.path.match(/\.(\w+)$/) || [])[1]).filter(Boolean))
  ).sort()]

  // Filter
  const filtered = files.filter(f => {
    if (lang !== "all" && !(f.path || "").endsWith(`.${lang}`)) return false
    if (stressOnly && (f._meta?.stressScore || 0) <= 10) return false
    if (filter) {
      const q = filter.toLowerCase()
      const matchPath    = (f.path || "").toLowerCase().includes(q)
      const matchImports = (f.imports || []).join(" ").toLowerCase().includes(q)
      if (!matchPath && !matchImports) return false
    }
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "stress")  return (b._meta?.stressScore || 0) - (a._meta?.stressScore || 0)
    if (sort === "imports") return (b.imports?.length || 0) - (a.imports?.length || 0)
    if (sort === "name")    return getFileName(a.path).localeCompare(getFileName(b.path))
    if (sort === "lines")   return (b.lines || 0) - (a.lines || 0)
    return 0
  })

  return (
    <div style={{
      width: 260, flexShrink: 0,
      display: "flex", flexDirection: "column",
      background: "#0e1117",
      border: "1px solid #1e2535",
      borderRadius: 8, overflow: "hidden",
      height: "calc(100vh - 260px)",
      minHeight: 300
    }}>

      {/* Header */}
      <div style={{
        padding: "10px 12px",
        borderBottom: "1px solid #1e2535",
        background: "#0a0c0f", flexShrink: 0
      }}>
        <div style={{
          fontSize: 10, textTransform: "uppercase",
          letterSpacing: "0.12em", color: "#4a5570",
          fontFamily: "monospace", marginBottom: 8
        }}>
          Files — {sorted.length}/{files.length}
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 8 }}>
          <span style={{
            position: "absolute", left: 8, top: "50%",
            transform: "translateY(-50%)",
            color: "#4a5570", fontSize: 11, pointerEvents: "none"
          }}>
            🔍
          </span>
          <input
            placeholder="Filter files or imports..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              width: "100%", padding: "6px 8px 6px 26px",
              background: "#111620", border: "1px solid #1e2535",
              borderRadius: 5, color: "#e8edf5",
              fontFamily: "monospace", fontSize: 11,
              outline: "none", boxSizing: "border-box"
            }}
          />
        </div>

        {/* Lang filter */}
        <div style={{
          display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8
        }}>
          {langs.slice(0, 6).map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              padding: "2px 7px", borderRadius: 3, border: "1px solid",
              borderColor: lang === l ? "#9c6fff44" : "#1e2535",
              background: lang === l ? "#9c6fff18" : "transparent",
              color: lang === l ? "#9c6fff" : "#4a5570",
              fontSize: 9, fontFamily: "monospace",
              cursor: "pointer", transition: "all 0.15s"
            }}>
              {l === "all" ? "all" : `.${l}`}
            </button>
          ))}
        </div>

        {/* Sort + stress toggle row */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 6
        }}>
          <div style={{ display: "flex", gap: 4 }}>
            <SortButton label="stress"  active={sort === "stress"}  onClick={() => setSort("stress")}  />
            <SortButton label="imports" active={sort === "imports"} onClick={() => setSort("imports")} />
            <SortButton label="name"    active={sort === "name"}    onClick={() => setSort("name")}    />
            <SortButton label="lines"   active={sort === "lines"}   onClick={() => setSort("lines")}   />
          </div>

          <label style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 9, color: stressOnly ? "#ff4444" : "#4a5570",
            fontFamily: "monospace", cursor: "pointer"
          }}>
            <input
              type="checkbox"
              checked={stressOnly}
              onChange={e => setStressOnly(e.target.checked)}
              style={{ margin: 0, accentColor: "#ff4444" }}
            />
            stress only
          </label>
        </div>
      </div>

      {/* File list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {sorted.length === 0 ? (
          <div style={{
            padding: 24, textAlign: "center",
            color: "#4a5570", fontFamily: "monospace", fontSize: 11
          }}>
            No files match your filter
          </div>
        ) : sorted.map((file, idx) => (
          <FileRow
            key={`${file.path}-${idx}`}
            file={file}
            isSelected={selectedFile?.path === file.path}
            onClick={() => selectFile(file)}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: "6px 12px",
        borderTop: "1px solid #1e2535",
        background: "#0a0c0f", flexShrink: 0,
        display: "flex", gap: 12,
        fontSize: 9, fontFamily: "monospace"
      }}>
        <span style={{ color: "#00e676" }}>
          ● {files.filter(f => (f._meta?.stressScore || 0) <= 8).length} low
        </span>
        <span style={{ color: "#ffb300" }}>
          ● {files.filter(f => {
            const s = f._meta?.stressScore || 0
            return s > 8 && s <= 15
          }).length} medium
        </span>
        <span style={{ color: "#ff4444" }}>
          ● {files.filter(f => (f._meta?.stressScore || 0) > 15).length} critical
        </span>
      </div>
    </div>
  )
}
