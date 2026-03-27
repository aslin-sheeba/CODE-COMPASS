import React from "react"
import { search } from "../services/searchService"
import { useProjectStore } from "../state/projectStore"

const C = {
  bg: "#0a0c0f",
  surface: "#111318",
  surfaceHover: "#161b24",
  border: "#1e2330",
  cyan: "#00e5ff",
  violet: "#9c6fff",
  green: "#00e676",
  red: "#ff4444",
  amber: "#ffb300",
  text: "#e2e8f0",
  muted: "#64748b",
  inputBg: "#0d1117",
  lineHl: "#1a2035",
  lineTarget: "#0d1f3c",
}

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  React.useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [])
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28,
      background: `linear-gradient(135deg, ${C.green}22, ${C.green}11)`,
      border: `1px solid ${C.green}60`,
      borderRadius: 10, padding: "12px 20px",
      color: C.green, fontSize: 13,
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 600,
      boxShadow: `0 8px 32px rgba(0,230,118,0.2)`,
      zIndex: 2000,
      animation: "slideUp 0.25s ease",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      ✅ {message}
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}

// ── Inline Editor ─────────────────────────────────────────────────────────────
function InlineEditor({ file, lineNumber, onSave, onCancel }) {
  const lines = (file.content || "").split("\n")
  const idx = lineNumber - 1
  const [editedLine, setEditedLine] = React.useState(lines[idx] || "")
  const [saving, setSaving] = React.useState(false)
  const [err, setErr] = React.useState("")
  const taRef = React.useRef()

  React.useEffect(() => { taRef.current?.focus() }, [])

  // Context: 3 lines above and below
  const ctxStart = Math.max(0, idx - 3)
  const ctxEnd = Math.min(lines.length - 1, idx + 3)
  const ctxLines = []
  for (let i = ctxStart; i <= ctxEnd; i++) {
    ctxLines.push({ num: i + 1, text: lines[i], isTarget: i === idx })
  }

  const handleSave = async () => {
    setSaving(true)
    setErr("")
    try {
      const newLines = [...lines]
      newLines[idx] = editedLine
      const newContent = newLines.join("\n")

      // Write to disk via Electron IPC
      const result = await window.electronAPI.writeFileLine({
        filePath: file.path,
        newContent,
      })

      if (result?.error) {
        setErr(result.error)
        setSaving(false)
        return
      }

      onSave(newContent, lineNumber, file)
    } catch (e) {
      setErr(e.message || "Save failed")
      setSaving(false)
    }
  }

  return (
    <div style={{
      margin: "6px 0 10px 0",
      background: C.lineTarget,
      border: `1px solid ${C.cyan}40`,
      borderRadius: 8,
      overflow: "hidden",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      {/* Header */}
      <div style={{
        padding: "6px 12px",
        background: `${C.cyan}10`,
        borderBottom: `1px solid ${C.border}`,
        fontSize: 11,
        color: C.cyan,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}>
        ✏️ Editing line {lineNumber}
      </div>

      {/* Context lines */}
      <div style={{ padding: "8px 0" }}>
        {ctxLines.map(({ num, text, isTarget }) => (
          <div
            key={num}
            style={{
              display: "flex",
              background: isTarget ? `${C.cyan}08` : "transparent",
              borderLeft: isTarget ? `2px solid ${C.cyan}` : "2px solid transparent",
              padding: "1px 0",
            }}
          >
            {/* Line number */}
            <span style={{
              width: 44, textAlign: "right",
              paddingRight: 12, paddingLeft: 8,
              color: isTarget ? C.cyan : C.muted,
              fontSize: 12, userSelect: "none",
              flexShrink: 0,
            }}>
              {num}
            </span>

            {/* Line content or textarea */}
            {isTarget ? (
              <textarea
                ref={taRef}
                value={editedLine}
                onChange={e => setEditedLine(e.target.value)}
                rows={1}
                onInput={e => {
                  e.target.style.height = "auto"
                  e.target.style.height = e.target.scrollHeight + "px"
                }}
                style={{
                  flex: 1,
                  background: `${C.cyan}10`,
                  border: `1px solid ${C.cyan}50`,
                  borderRadius: 4,
                  color: C.text,
                  fontSize: 12,
                  fontFamily: "inherit",
                  padding: "2px 8px",
                  resize: "none",
                  outline: "none",
                  lineHeight: 1.6,
                  marginRight: 8,
                  overflow: "hidden",
                }}
              />
            ) : (
              <span style={{ fontSize: 12, color: C.muted, paddingTop: 2 }}>
                {text || " "}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {err && (
        <div style={{ padding: "4px 12px 8px", fontSize: 12, color: C.red }}>
          ⚠️ {err}
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: "flex", gap: 8, padding: "8px 12px",
        borderTop: `1px solid ${C.border}`,
        background: `${C.surface}88`,
      }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? C.border : C.cyan,
            border: "none", borderRadius: 6,
            color: saving ? C.muted : "#000",
            padding: "6px 16px", fontSize: 12,
            fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
          }}
        >
          {saving ? "Saving..." : "💾 Save"}
        </button>
        <button
          onClick={onCancel}
          style={{
            background: "none", border: `1px solid ${C.border}`,
            borderRadius: 6, color: C.muted,
            padding: "6px 14px", fontSize: 12,
            cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.target.style.borderColor = C.red; e.target.style.color = C.red }}
          onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.muted }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Result Row ────────────────────────────────────────────────────────────────
function ResultRow({ result, file, onEdit, editingKey, onSaveEdit, onCancelEdit }) {
  const [hovered, setHovered] = React.useState(false)
  const key = `${result.path}:${result.line}`
  const isEditing = editingKey === key

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "7px 12px",
          background: hovered ? C.surfaceHover : "transparent",
          borderRadius: 6,
          cursor: "default",
          transition: "background 0.12s",
          gap: 10,
        }}
      >
        {/* Line number badge */}
        {result.line && (
          <span style={{
            background: `${C.violet}20`,
            border: `1px solid ${C.violet}40`,
            borderRadius: 4,
            color: C.violet,
            fontSize: 10,
            padding: "1px 6px",
            fontFamily: "'JetBrains Mono', monospace",
            flexShrink: 0,
          }}>
            L{result.line}
          </span>
        )}

        {/* Snippet */}
        <span style={{
          fontSize: 12, color: C.text,
          fontFamily: "'JetBrains Mono', monospace",
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {result.snippet || <span style={{ color: C.muted }}>filename match</span>}
        </span>

        {/* Edit button — only for line results on files we have */}
        {result.line && file && (hovered || isEditing) && (
          <button
            onClick={() => onEdit(key)}
            style={{
              background: isEditing ? `${C.amber}20` : `${C.cyan}15`,
              border: `1px solid ${isEditing ? C.amber : C.cyan}50`,
              borderRadius: 5,
              color: isEditing ? C.amber : C.cyan,
              padding: "3px 10px",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
          >
            {isEditing ? "Editing..." : "✏️ Edit"}
          </button>
        )}
      </div>

      {/* Inline editor */}
      {isEditing && file && (
        <InlineEditor
          file={file}
          lineNumber={result.line}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
        />
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CodeSearch() {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState([])
  const [editingKey, setEditingKey] = React.useState(null)
  const [toast, setToast] = React.useState(null)

  const { files, setFiles, selectFile, setHighlightedFile } = useProjectStore()

  // Debounced search
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) setResults(search(query))
      else setResults([])
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  // Group results by file
  const grouped = React.useMemo(() => {
    const map = {}
    for (const r of results) {
      if (!map[r.path]) map[r.path] = []
      map[r.path].push(r)
    }
    return map
  }, [results])

  const getExt = (p) => (p || "").split(".").pop().toUpperCase()

  const handleEdit = (key) => {
    setEditingKey(prev => prev === key ? null : key)
  }

  const handleSaveEdit = (newContent, lineNumber, file) => {
    // Update in-memory file content in Zustand store
    const updatedFiles = files.map(f =>
      f.path === file.path
        ? { ...f, content: newContent, lines: newContent.split("\n").length }
        : f
    )
    setFiles(updatedFiles)
    setEditingKey(null)

    const fileName = (file.path || "").split(/[/\\]/).pop()
    setToast(`Line ${lineNumber} updated in ${fileName}`)

    // Re-run search to reflect updated content
    if (query.trim()) {
      setTimeout(() => setResults(search(query)), 50)
    }
  }

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      height: "100%",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Search bar */}
      <div style={{
        position: "sticky", top: 0,
        background: C.bg,
        paddingBottom: 14,
        zIndex: 10,
      }}>
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)",
            color: C.muted, fontSize: 15, pointerEvents: "none",
          }}>🔍</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search files, symbols, content..."
            style={{
              width: "100%",
              background: C.inputBg,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.text,
              padding: "11px 14px 11px 40px",
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = C.cyan}
            onBlur={e => e.target.style.borderColor = C.border}
          />
          {query && (
            <span style={{
              position: "absolute", right: 12, top: "50%",
              transform: "translateY(-50%)",
              color: C.muted, fontSize: 12,
            }}>
              {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!query && (
        <div style={{ textAlign: "center", marginTop: 60, color: C.muted, fontSize: 13 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔎</div>
          <div>Type to search across all project files</div>
          <div style={{ fontSize: 11, marginTop: 6, color: C.border }}>
            Searches filenames, imports, and line content
          </div>
        </div>
      )}

      {/* No results */}
      {query && results.length === 0 && (
        <div style={{ textAlign: "center", marginTop: 60, color: C.muted, fontSize: 13 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌫️</div>
          No results for <strong style={{ color: C.text }}>"{query}"</strong>
        </div>
      )}

      {/* Results grouped by file */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {Object.entries(grouped).map(([filePath, fileResults]) => {
          const file = files.find(f => f.path === filePath)
          const fileName = filePath.split(/[/\\]/).pop()
          const dir = filePath.split(/[/\\]/).slice(0, -1).join("/")

          return (
            <div
              key={filePath}
              style={{
                marginBottom: 10,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {/* File header */}
              <div
                onClick={() => file && (selectFile(file), setHighlightedFile(file))}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px",
                  background: `${C.surface}`,
                  borderBottom: `1px solid ${C.border}`,
                  cursor: file ? "pointer" : "default",
                }}
              >
                <span style={{
                  background: `${C.cyan}18`,
                  border: `1px solid ${C.cyan}30`,
                  borderRadius: 4,
                  color: C.cyan,
                  fontSize: 9,
                  padding: "2px 6px",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  flexShrink: 0,
                }}>
                  {getExt(filePath)}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  {fileName}
                </span>
                <span style={{ fontSize: 11, color: C.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  ./{dir}
                </span>
                <span style={{
                  background: `${C.violet}18`,
                  border: `1px solid ${C.violet}30`,
                  borderRadius: 10,
                  color: C.violet,
                  fontSize: 10,
                  padding: "2px 8px",
                  flexShrink: 0,
                }}>
                  {fileResults.length} match{fileResults.length !== 1 ? "es" : ""}
                </span>
              </div>

              {/* Result rows */}
              <div style={{ padding: "4px 0" }}>
                {fileResults.map((r, i) => {
                  const key = `${r.path}:${r.line}`
                  return (
                    <ResultRow
                      key={i}
                      result={r}
                      file={file}
                      editingKey={editingKey}
                      onEdit={handleEdit}
                      onSaveEdit={(newContent, lineNumber) => handleSaveEdit(newContent, lineNumber, file)}
                      onCancelEdit={() => setEditingKey(null)}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}