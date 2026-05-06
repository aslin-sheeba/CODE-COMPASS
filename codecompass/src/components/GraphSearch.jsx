import React from "react"
import { useProjectStore } from "../state/projectStore"
import { T } from "../theme"

/**
 * GraphSearch — search files and highlight them in the module graph.
 * Wired directly into Architecture.jsx (task 10).
 */
export default function GraphSearch() {
  const { files, setHighlightedFile } = useProjectStore()
  const [query,   setQuery]   = React.useState("")
  const [results, setResults] = React.useState([])
  const inputRef = React.useRef()

  React.useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setResults(
      files
        .filter(f => f.path.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10)
    )
  }, [query, files])

  // Close dropdown on outside click
  React.useEffect(() => {
    const handler = (e) => {
      if (!inputRef.current?.parentElement?.contains(e.target)) setResults([])
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSelect = (f) => {
    setHighlightedFile(f)
    setQuery("")
    setResults([])
  }

  const fileName = p => p.replace(/\\/g, "/").split("/").pop()
  const fileDir  = p => {
    const parts = p.replace(/\\/g, "/").split("/")
    return parts.length > 1 ? parts.slice(0, -1).join("/") : ""
  }

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: 10, top: "50%",
          transform: "translateY(-50%)",
          color: T.textHint, fontSize: 13, pointerEvents: "none",
        }}>⌕</span>
        <input
          ref={inputRef}
          placeholder="Search files in graph…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Escape" && setQuery("")}
          style={{
            width: "100%", padding: "8px 12px 8px 32px",
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: T.rMd, color: T.text,
            fontFamily: "monospace", fontSize: 12,
            outline: "none", boxSizing: "border-box",
            transition: "border-color 0.15s",
          }}
          onFocus={e  => e.target.style.borderColor = T.brand}
          onBlur={e   => e.target.style.borderColor = T.border}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{
              position: "absolute", right: 10, top: "50%",
              transform: "translateY(-50%)",
              background: "none", border: "none", color: T.textHint,
              cursor: "pointer", fontSize: 13, padding: 0,
            }}
          >✕</button>
        )}
      </div>

      {results.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: T.rMd, zIndex: 100,
          maxHeight: 240, overflowY: "auto",
          boxShadow: `0 4px 12px rgba(0,0,0,0.08)`,
        }}>
          {results.map((f, i) => (
            <div
              key={i}
              onClick={() => handleSelect(f)}
              style={{
                padding: "8px 12px", cursor: "pointer",
                borderBottom: i < results.length - 1 ? `1px solid ${T.border}` : "none",
                display: "flex", flexDirection: "column", gap: 2,
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.surfaceAlt}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 11, color: T.text, fontFamily: "monospace", fontWeight: 600 }}>
                {fileName(f.path)}
              </span>
              <span style={{ fontSize: 9, color: T.textHint, fontFamily: "monospace" }}>
                {fileDir(f.path)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
