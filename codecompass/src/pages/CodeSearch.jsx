import React from "react"
import { search } from "../services/searchService"
import { useProjectStore } from "../state/projectStore"

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getExtColor(path) {
  const ext = (path || "").match(/\.(\w+)$/)?.[1] || "other"
  const map = {
    tsx: "#00e5ff", ts: "#3b82f6", jsx: "#06b6d4",
    js:  "#ffb300", css: "#9c6fff", json: "#00e676",
    md:  "#f97316", html: "#ef4444"
  }
  return map[ext] || "#4a5570"
}

function getFileName(path) {
  return (path || "").replace(/\\/g, "/").split("/").pop()
}

function getExt(path) {
  return (path || "").match(/\.(\w+)$/)?.[1] || "?"
}

function getDir(path) {
  const parts = (path || "").replace(/\\/g, "/").split("/")
  return parts.slice(0, -1).join("/") || "."
}

function highlight(text, query) {
  if (!query || !text) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <span style={{
        background: "rgba(0,229,255,0.18)",
        color: "#00e5ff", borderRadius: 2, padding: "0 2px"
      }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </span>
  )
}

function groupByFile(results) {
  const map = {}
  results.forEach(r => {
    if (!map[r.path]) map[r.path] = []
    map[r.path].push(r)
  })
  return Object.entries(map).map(([path, hits]) => ({ path, hits }))
}

// ─── INLINE CODE PREVIEW ──────────────────────────────────────────────────────
function CodePreviewPanel({ file, query, onClose }) {
  if (!file) return null

  const ext   = getExt(file.path)
  const color = getExtColor(file.path)
  const lines = (file.content || "No content available").split("\n")

  const matchingLines = new Set()
  if (query) {
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(query.toLowerCase()))
        matchingLines.add(i)
    })
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: "#0e1117", border: "1px solid #1e2535",
      borderRadius: 8, overflow: "hidden", height: "100%"
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px", background: "#0a0c0f",
        borderBottom: "1px solid #1e2535",
        display: "flex", alignItems: "center",
        gap: 10, flexShrink: 0
      }}>
        <div style={{
          width: 28, height: 19, borderRadius: 3,
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
            {getFileName(file.path)}
          </div>
          <div style={{
            fontSize: 9, color: "#2e3d5a",
            fontFamily: "monospace", marginTop: 1,
            overflow: "hidden", textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            {file.path}
          </div>
        </div>
        <div style={{
          display: "flex", gap: 10,
          alignItems: "center", flexShrink: 0
        }}>
          {matchingLines.size > 0 && (
            <span style={{
              fontSize: 10, color: "#00e5ff",
              fontFamily: "monospace", padding: "2px 8px",
              borderRadius: 4, background: "#00e5ff12",
              border: "1px solid #00e5ff33"
            }}>
              {matchingLines.size} match{matchingLines.size !== 1 ? "es" : ""}
            </span>
          )}
          <span style={{
            fontSize: 10, color: "#4a5570", fontFamily: "monospace"
          }}>
            {lines.length} lines
          </span>
          <button onClick={onClose} style={{
            background: "#1e2535", border: "none",
            color: "#8a95b0", cursor: "pointer",
            padding: "3px 10px", borderRadius: 4,
            fontSize: 11, fontFamily: "monospace"
          }}>
            ✕ close
          </button>
        </div>
      </div>

      {/* Code */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{
          width: "100%", borderCollapse: "collapse",
          fontFamily: "monospace", fontSize: 11
        }}>
          <tbody>
            {lines.map((line, i) => {
              const isMatch = matchingLines.has(i)
              return (
                <tr key={i} style={{
                  background: isMatch
                    ? "rgba(0,229,255,0.06)" : "transparent"
                }}>
                  <td style={{
                    padding: "1px 12px 1px 8px",
                    color: isMatch ? "#00e5ff" : "#2e3d5a",
                    textAlign: "right", userSelect: "none",
                    width: 40, fontSize: 10,
                    borderRight: `1px solid ${isMatch
                      ? "#00e5ff22" : "#1e2535"}`,
                    background: isMatch
                      ? "rgba(0,229,255,0.04)" : "#0a0c0f",
                    whiteSpace: "nowrap"
                  }}>
                    {i + 1}
                  </td>
                  <td style={{
                    padding: "1px 16px",
                    color: isMatch ? "#e8edf5" : "#6b7a99",
                    whiteSpace: "pre",
                    borderLeft: isMatch
                      ? "2px solid #00e5ff"
                      : "2px solid transparent"
                  }}>
                    {isMatch && query
                      ? highlight(line, query)
                      : (line || " ")
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── FILTER BAR ───────────────────────────────────────────────────────────────
function FilterBar({ results, activeFilter, onFilter }) {
  const extCounts = React.useMemo(() => {
    const map = { all: results.length }
    results.forEach(r => {
      const ext = getExt(r.path)
      map[ext] = (map[ext] || 0) + 1
    })
    return map
  }, [results])

  const exts = ["all", ...Object.keys(extCounts).filter(k => k !== "all")]
  if (exts.length <= 2) return null

  return (
    <div style={{
      padding: "8px 20px", borderBottom: "1px solid #1e2535",
      background: "#0a0c0f", display: "flex",
      gap: 6, flexWrap: "wrap", flexShrink: 0
    }}>
      <span style={{
        fontSize: 9, textTransform: "uppercase",
        letterSpacing: "0.1em", color: "#4a5570",
        fontFamily: "monospace", alignSelf: "center",
        marginRight: 4
      }}>
        Filter
      </span>
      {exts.map(ext => {
        const color  = ext === "all"
          ? "#e8edf5" : getExtColor(`file.${ext}`)
        const active = activeFilter === ext
        const count  = extCounts[ext] || 0
        return (
          <button key={ext} onClick={() => onFilter(ext)} style={{
            padding: "3px 10px", borderRadius: 5,
            border: "1px solid",
            borderColor: active ? `${color}55` : "#1e2535",
            background: active ? `${color}12` : "transparent",
            color: active ? color : "#4a5570",
            fontSize: 10, fontFamily: "monospace",
            cursor: "pointer", transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: 5
          }}>
            {ext === "all" ? "all" : `.${ext}`}
            <span style={{
              fontSize: 9,
              color: active ? color : "#2e3d5a",
              background: active ? `${color}18` : "#1e2535",
              padding: "0 4px", borderRadius: 3
            }}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── FILE GROUP ───────────────────────────────────────────────────────────────
function FileGroup({ path, hits, query, focusedIdx,
  globalOffset, previewPath, onSelect, onOpenFile }) {
  const [collapsed, setCollapsed] = React.useState(false)
  const ext       = getExt(path)
  const color     = getExtColor(path)
  const dir       = getDir(path)
  const isPreview = previewPath === path

  return (
    <div style={{
      marginBottom: 8, background: "#0e1117",
      border: `1px solid ${isPreview ? "#00e5ff44" : "#1e2535"}`,
      borderRadius: 8, overflow: "hidden"
    }}>
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          padding: "9px 14px",
          background: isPreview ? "#00e5ff08" : "#111620",
          borderBottom: collapsed ? "none" : "1px solid #1e2535",
          display: "flex", alignItems: "center",
          gap: 10, cursor: "pointer"
        }}
      >
        <div style={{
          width: 28, height: 18, borderRadius: 3,
          background: `${color}18`, border: `1px solid ${color}44`,
          display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 7,
          fontFamily: "monospace", fontWeight: 700,
          color, flexShrink: 0
        }}>
          {ext}
        </div>
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: isPreview ? "#00e5ff" : "#e8edf5",
          fontFamily: "monospace"
        }}>
          {highlight(getFileName(path), query)}
        </span>
        <span style={{
          fontSize: 9, color: "#2e3d5a",
          fontFamily: "monospace", flex: 1,
          overflow: "hidden", textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}>
          {dir}
        </span>
        <span style={{
          padding: "1px 8px", borderRadius: 10,
          background: `${color}18`, border: `1px solid ${color}33`,
          fontSize: 9, color, fontFamily: "monospace",
          fontWeight: 700, flexShrink: 0
        }}>
          {hits.length} match{hits.length !== 1 ? "es" : ""}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onOpenFile(path) }}
          style={{
            padding: "2px 8px", borderRadius: 4,
            border: `1px solid ${isPreview ? "#00e5ff44" : "#1e2535"}`,
            background: isPreview ? "#00e5ff12" : "transparent",
            color: isPreview ? "#00e5ff" : "#4a5570",
            cursor: "pointer", fontSize: 9,
            fontFamily: "monospace", flexShrink: 0,
            transition: "all 0.15s"
          }}
          onMouseEnter={e => {
            if (!isPreview) {
              e.target.style.borderColor = "#00e5ff44"
              e.target.style.color = "#00e5ff"
            }
          }}
          onMouseLeave={e => {
            if (!isPreview) {
              e.target.style.borderColor = "#1e2535"
              e.target.style.color = "#4a5570"
            }
          }}
        >
          {isPreview ? "● viewing" : "view source"}
        </button>
        <span style={{
          color: "#4a5570", fontSize: 10, flexShrink: 0,
          transition: "transform 0.2s",
          transform: collapsed ? "rotate(0deg)" : "rotate(90deg)"
        }}>
          ▶
        </span>
      </div>

      {!collapsed && hits.map((hit, i) => {
        const globalIdx = globalOffset + i
        const isFocused = focusedIdx === globalIdx
        return (
          <div
            key={i}
            data-result-idx={globalIdx}
            onClick={() => onSelect(path, hit, globalIdx)}
            style={{
              padding: "7px 14px 7px 52px",
              borderBottom: i < hits.length - 1
                ? "1px solid #0a0c0f" : "none",
              cursor: "pointer",
              background: isFocused ? "#00e5ff08" : "transparent",
              borderLeft: `2px solid ${isFocused
                ? "#00e5ff" : "transparent"}`,
              transition: "all 0.1s",
              display: "flex", alignItems: "flex-start", gap: 10
            }}
            onMouseEnter={e => {
              if (!isFocused)
                e.currentTarget.style.background = "#111620"
            }}
            onMouseLeave={e => {
              if (!isFocused)
                e.currentTarget.style.background = "transparent"
            }}
          >
            <span style={{
              fontSize: 9, color: "#2e3d5a",
              fontFamily: "monospace", flexShrink: 0,
              marginTop: 2, width: 30, textAlign: "right"
            }}>
              {hit.line || "—"}
            </span>
            <span style={{
              fontSize: 11, fontFamily: "monospace",
              color: "#6b7a99", lineHeight: 1.6,
              overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: "nowrap", flex: 1
            }}>
              {hit.snippet
                ? highlight(hit.snippet.trim(), query)
                : <span style={{ color: "#2e3d5a" }}>
                    filename match
                  </span>
              }
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function CodeSearch() {
  const { files } = useProjectStore()

  const [query,        setQuery]        = React.useState("")
  const [results,      setResults]      = React.useState([])
  const [activeFilter, setActiveFilter] = React.useState("all")
  const [focusedIdx,   setFocusedIdx]   = React.useState(null)
  const [previewFile,  setPreviewFile]  = React.useState(null)
  const [elapsed,      setElapsed]      = React.useState(null)

  const inputRef    = React.useRef(null)
  const resultsRef  = React.useRef([])
  const focusedRef  = React.useRef(null)

  React.useEffect(() => { focusedRef.current = focusedIdx }, [focusedIdx])

  React.useEffect(() => { inputRef.current?.focus() }, [])

  // Ctrl+F
  React.useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener("keydown", handler, true)
    return () => document.removeEventListener("keydown", handler, true)
  }, [])

  // Open file preview
  const openPreview = React.useCallback((path) => {
    const file = files.find(f => f.path === path)
    if (file) setPreviewFile(file)
  }, [files])

  // Debounced search
  React.useEffect(() => {
    if (!query.trim()) {
      setResults([])
      resultsRef.current = []
      setElapsed(null)
      setFocusedIdx(null)
      setActiveFilter("all")
      setPreviewFile(null)
      return
    }
    const t = setTimeout(() => {
      const start = performance.now()
      const r     = search(query)
      setResults(r)
      resultsRef.current = r
      setElapsed(Math.round(performance.now() - start))
      setFocusedIdx(null)
    }, 150)
    return () => clearTimeout(t)
  }, [query])

  const filteredResults = React.useMemo(() => {
    const r = activeFilter === "all"
      ? results
      : results.filter(r => getExt(r.path) === activeFilter)
    resultsRef.current = r
    return r
  }, [results, activeFilter])

  const groups = React.useMemo(
    () => groupByFile(filteredResults), [filteredResults]
  )

  const groupOffsets = React.useMemo(() => {
    const offsets = []
    let off = 0
    groups.forEach(g => { offsets.push(off); off += g.hits.length })
    return offsets
  }, [groups])

  // ── Keyboard nav on input ──────────────────────────────────────────────────
  const handleInputKeyDown = (e) => {
    const allResults = resultsRef.current
    const total      = allResults.length
    const focused    = focusedRef.current

    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!total) return
      const next = focused === null ? 0 : Math.min(focused + 1, total - 1)
      setFocusedIdx(next)
      focusedRef.current = next
      requestAnimationFrame(() => {
        document.querySelector(`[data-result-idx="${next}"]`)
          ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
      })

    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (!total) return
      const next = focused === null
        ? total - 1 : Math.max(focused - 1, 0)
      setFocusedIdx(next)
      focusedRef.current = next
      requestAnimationFrame(() => {
        document.querySelector(`[data-result-idx="${next}"]`)
          ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
      })

    } else if (e.key === "Enter") {
      // Show source inline — no navigation needed
      const idx  = focused !== null ? focused : 0
      const item = allResults[idx]
      if (item) {
        openPreview(item.path)
        setFocusedIdx(idx)
        focusedRef.current = idx
      }

    } else if (e.key === "Escape") {
      e.preventDefault()
      if (previewFile) {
        setPreviewFile(null)
      } else {
        setQuery("")
        setResults([])
        resultsRef.current = []
        setFocusedIdx(null)
      }
    }
  }

  const handleSelectResult = (path, hit, globalIdx) => {
    setFocusedIdx(globalIdx)
    focusedRef.current = globalIdx
    openPreview(path)
  }

  const hasFiles  = files.length > 0
  const showEmpty = !query.trim()
  const showNone  = query.trim().length > 0 && filteredResults.length === 0

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", background: "#0a0c0f", overflow: "hidden"
    }}>

      {/* HEADER */}
      <div style={{
        padding: "14px 20px 10px",
        borderBottom: "1px solid #1e2535",
        background: "#0e1117", flexShrink: 0
      }}>
        <h2 style={{
          fontSize: 17, fontWeight: 700,
          margin: 0, marginBottom: 2, color: "#e8edf5"
        }}>
          Code Search
        </h2>
        <div style={{
          fontSize: 11, color: "#4a5570", fontFamily: "monospace"
        }}>
          // press Enter or click "view source" to preview inline
        </div>
      </div>

      {/* SEARCH INPUT */}
      <div style={{
        padding: "12px 20px",
        borderBottom: "1px solid #1e2535",
        background: "#0e1117", flexShrink: 0
      }}>
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)",
            fontSize: 16, color: "#4a5570", pointerEvents: "none"
          }}>
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder={
              hasFiles
                ? "Search files, imports, functions, variables..."
                : "Import a project first..."
            }
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            disabled={!hasFiles}
            style={{
              width: "100%", padding: "11px 110px 11px 44px",
              background: "#111620",
              border: `1px solid ${query ? "#00e5ff33" : "#1e2535"}`,
              borderRadius: 8, color: "#e8edf5",
              fontFamily: "monospace", fontSize: 13,
              outline: "none", transition: "border 0.15s",
              boxSizing: "border-box",
              opacity: hasFiles ? 1 : 0.5
            }}
            onFocus={e => e.target.style.borderColor = "#00e5ff44"}
            onBlur={e =>
              e.target.style.borderColor = query
                ? "#00e5ff33" : "#1e2535"
            }
          />
          <div style={{
            position: "absolute", right: query ? 36 : 12,
            top: "50%", transform: "translateY(-50%)",
            display: "flex", gap: 4
          }}>
            {["↑", "↓", "Enter"].map(k => (
              <kbd key={k} style={{
                padding: "1px 5px", borderRadius: 3,
                background: "#1e2535", border: "1px solid #2e3d5a",
                color: "#4a5570", fontFamily: "monospace",
                fontSize: 9, fontWeight: 700
              }}>
                {k}
              </kbd>
            ))}
          </div>
          {query && (
            <button
              onClick={() => {
                setQuery("")
                setResults([])
                resultsRef.current = []
                setFocusedIdx(null)
                setPreviewFile(null)
                inputRef.current?.focus()
              }}
              style={{
                position: "absolute", right: 10, top: "50%",
                transform: "translateY(-50%)",
                background: "#1e2535", border: "none",
                color: "#4a5570", cursor: "pointer",
                width: 20, height: 20, borderRadius: "50%",
                fontSize: 11, display: "flex",
                alignItems: "center", justifyContent: "center"
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* STATS */}
      {filteredResults.length > 0 && (
        <div style={{
          padding: "6px 20px", borderBottom: "1px solid #1e2535",
          background: "#0a0c0f", flexShrink: 0,
          display: "flex", alignItems: "center",
          justifyContent: "space-between"
        }}>
          <span style={{
            fontSize: 10, color: "#4a5570", fontFamily: "monospace"
          }}>
            <span style={{ color: "#00e5ff", fontWeight: 700 }}>
              {filteredResults.length}
            </span>
            {" "}matches in{" "}
            <span style={{ color: "#9c6fff", fontWeight: 700 }}>
              {groups.length}
            </span>
            {" "}files for{" "}
            <span style={{ color: "#ffb300" }}>"{query}"</span>
            {elapsed !== null && (
              <span style={{ color: "#2e3d5a", marginLeft: 10 }}>
                {elapsed}ms
              </span>
            )}
          </span>
          {focusedIdx !== null && (
            <span style={{
              fontSize: 9, color: "#4a5570", fontFamily: "monospace"
            }}>
              {focusedIdx + 1} / {filteredResults.length}
            </span>
          )}
        </div>
      )}

      {/* FILTER */}
      {results.length > 0 && (
        <FilterBar
          results={results}
          activeFilter={activeFilter}
          onFilter={ext => {
            setActiveFilter(ext)
            setFocusedIdx(null)
          }}
        />
      )}

      {/* SPLIT VIEW */}
      <div style={{
        flex: 1, display: "flex",
        overflow: "hidden"
      }}>
        {/* Results list */}
        <div style={{
          width: previewFile ? "360px" : "100%",
          flexShrink: 0, overflow: "auto",
          padding: "12px 16px",
          borderRight: previewFile
            ? "1px solid #1e2535" : "none"
        }}>
          {showEmpty && (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 14, padding: 60, color: "#4a5570",
              textAlign: "center"
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                border: "1px solid #1e2535",
                display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 24
              }}>
                🔍
              </div>
              <div style={{
                fontSize: 14, fontWeight: 700, color: "#6b7a99"
              }}>
                {hasFiles
                  ? "Start typing to search"
                  : "No project loaded"
                }
              </div>
              <div style={{
                fontSize: 11, fontFamily: "monospace",
                color: "#2e3d5a", maxWidth: 280, lineHeight: 1.6
              }}>
                {hasFiles
                  ? "Press Enter or click \"view source\" to see the file inline"
                  : "Import a project from Dashboard first"
                }
              </div>
              {hasFiles && (
                <div style={{
                  marginTop: 8, display: "flex",
                  flexDirection: "column",
                  gap: 6, alignItems: "center"
                }}>
                  {[
                    ["↑ ↓",   "Navigate results"    ],
                    ["Enter", "View source inline"   ],
                    ["Esc",   "Close preview / clear"],
                  ].map(([key, desc]) => (
                    <div key={key} style={{
                      display: "flex", gap: 10, alignItems: "center"
                    }}>
                      <kbd style={{
                        padding: "2px 8px", borderRadius: 4,
                        background: "#111620",
                        border: "1px solid #1e2535",
                        color: "#00e5ff",
                        fontFamily: "monospace",
                        fontSize: 10, fontWeight: 700
                      }}>
                        {key}
                      </kbd>
                      <span style={{
                        fontSize: 10, color: "#4a5570",
                        fontFamily: "monospace"
                      }}>
                        {desc}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showNone && (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 12, padding: 48, color: "#4a5570",
              textAlign: "center"
            }}>
              <div style={{ fontSize: 28 }}>¯\_(ツ)_/¯</div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: "#6b7a99"
              }}>
                No results for "{query}"
              </div>
            </div>
          )}

          {groups.map(({ path, hits }, gi) => (
            <FileGroup
              key={path}
              path={path}
              hits={hits}
              query={query}
              focusedIdx={focusedIdx}
              globalOffset={groupOffsets[gi]}
              previewPath={previewFile?.path}
              onSelect={handleSelectResult}
              onOpenFile={openPreview}
            />
          ))}
        </div>

        {/* Inline code preview */}
        {previewFile && (
          <div style={{
            flex: 1, overflow: "hidden", padding: 12
          }}>
            <CodePreviewPanel
              file={previewFile}
              query={query}
              onClose={() => setPreviewFile(null)}
            />
          </div>
        )}
      </div>

      {/* FOOTER */}
      {hasFiles && (
        <div style={{
          padding: "6px 20px",
          borderTop: "1px solid #1e2535",
          background: "#0e1117", flexShrink: 0,
          display: "flex", gap: 20, alignItems: "center"
        }}>
          {[
            ["↑↓",    "navigate"        ],
            ["Enter", "view source"      ],
            ["Esc",   "close / clear"    ],
            ["Ctrl+F","focus"            ],
            [files.length + " files", "indexed"],
          ].map(([key, val]) => (
            <div key={key} style={{
              fontSize: 9, fontFamily: "monospace", color: "#2e3d5a"
            }}>
              <span style={{ color: "#4a5570" }}>{key}</span>
              {" · "}{val}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}