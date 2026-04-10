import React from "react"
import { search } from "../services/searchService"
import { useProjectStore } from "../state/projectStore"
import { T } from "../theme"

// ── Syntax highlighting (prism-style, inline — no CDN needed) ─────────────────
const LANG_PATTERNS = {
  comment:  { re: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,      color: T.cmColor  },
  string:   { re: /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g,     color: T.strColor },
  keyword:  { re: /\b(import|export|from|const|let|var|function|return|class|extends|default|if|else|for|while|async|await|new|this|typeof|null|undefined|true|false)\b/g, color: T.kwColor },
  fn:       { re: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, color: T.fnColor  },
  number:   { re: /\b(\d+\.?\d*)\b/g,                     color: T.orange   },
}

function tokenize(line, matchStart, matchEnd, query) {
  // Build a list of {text, color, isMatch} spans
  const len = line.length
  const colors = new Array(len).fill(null)

  // Apply syntax patterns (don't mutate strings, just track colors per char index)
  for (const { re, color } of Object.values(LANG_PATTERNS)) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(line)) !== null) {
      for (let i = m.index; i < m.index + m[0].length; i++) {
        if (i < len) colors[i] = color
      }
    }
  }

  // Build spans, splitting at match boundaries
  const spans = []
  let i = 0
  while (i < len) {
    const isMatch = matchStart != null && i >= matchStart && i < matchEnd
    const color   = colors[i] || T.codeText
    let j = i + 1
    while (
      j < len &&
      (colors[j] || T.codeText) === color &&
      (matchStart == null || (j >= matchStart) === (i >= matchStart)) &&
      (matchEnd   == null || (j < matchEnd)    === (i < matchEnd))
    ) j++
    spans.push({ text: line.slice(i, j), color, isMatch })
    i = j
  }
  return spans
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  React.useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t) }, [])
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24,
      background: T.greenLight, border: `1px solid ${T.greenBorder}`,
      borderRadius: T.rMd, padding: "10px 18px",
      color: T.green, fontSize: 12, fontFamily: "monospace", fontWeight: 600,
      zIndex: 2000,
    }}>✓ {message}</div>
  )
}

// ── Inline Editor ─────────────────────────────────────────────────────────────
function InlineEditor({ file, lineNumber, onSave, onCancel }) {
  if (!file) return null
  const lines = (file.content || "").split("\n")
  const idx   = lineNumber - 1
  const [editedLine, setEditedLine] = React.useState(lines[idx] ?? "")
  const [saving, setSaving]         = React.useState(false)
  const [err, setErr]               = React.useState("")
  const taRef = React.useRef()
  React.useEffect(() => { taRef.current?.focus() }, [])

  const ctxStart = Math.max(0, idx - 2)
  const ctxEnd   = Math.min(lines.length - 1, idx + 2)
  const ctxLines = []
  for (let i = ctxStart; i <= ctxEnd; i++) ctxLines.push({ num: i+1, text: lines[i], isTarget: i === idx })

  const handleSave = async () => {
    if (!window.electronAPI?.writeFileLine) { setErr("Requires Electron app."); return }
    setSaving(true); setErr("")
    try {
      const newLines = [...lines]; newLines[idx] = editedLine
      const newContent = newLines.join("\n")
      const result = await window.electronAPI.writeFileLine({ filePath: file.realPath || file.path, newContent })
      if (result?.error) { setErr(result.error); setSaving(false); return }
      onSave(newContent, lineNumber, file)
    } catch (e) { setErr(e.message || "Save failed"); setSaving(false) }
  }

  return (
    <div style={{ margin: "4px 0 8px", background: T.tealLight, border: `1px solid ${T.tealBorder}`, borderRadius: T.rMd, overflow: "hidden" }}>
      <div style={{ padding: "5px 12px", borderBottom: `1px solid ${T.tealBorder}`, fontSize: 10, color: T.teal, letterSpacing: "0.08em" }}>
        editing line {lineNumber}
      </div>
      <div style={{ padding: "6px 0", fontFamily: "monospace" }}>
        {ctxLines.map(({ num, text, isTarget }) => (
          <div key={num} style={{ display: "flex", background: isTarget ? T.brandLight : "transparent", borderLeft: isTarget ? `2px solid ${T.brand}` : "2px solid transparent" }}>
            <span style={{ width: 36, textAlign: "right", paddingRight: 10, color: isTarget ? T.brand : T.textHint, fontSize: 10.5, flexShrink: 0 }}>{num}</span>
            {isTarget ? (
              <textarea ref={taRef} value={editedLine} onChange={e => setEditedLine(e.target.value)} rows={1}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px" }}
                style={{ flex: 1, background: "transparent", border: `1px solid ${T.teal}`, borderRadius: 4, color: T.text, fontSize: 11.5, fontFamily: "inherit", padding: "1px 8px", resize: "none", outline: "none", marginRight: 8 }}
              />
            ) : (
              <span style={{ fontSize: 11.5, color: T.textSub }}>{text || " "}</span>
            )}
          </div>
        ))}
      </div>
      {err && <div style={{ padding: "4px 12px 6px", fontSize: 11, color: T.red }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, padding: "8px 12px", borderTop: `1px solid ${T.tealBorder}` }}>
        <button onClick={handleSave} disabled={saving} style={{ padding: "5px 14px", background: saving ? T.border : T.brand, border: "none", borderRadius: T.r, color: "#fff", fontSize: 11, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "monospace" }}>
          {saving ? "saving…" : "save"}
        </button>
        <button onClick={onCancel} style={{ padding: "5px 12px", background: "none", border: `1px solid ${T.border}`, borderRadius: T.r, color: T.textSub, fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>cancel</button>
      </div>
    </div>
  )
}

// ── Result Row with syntax highlighting + context lines ───────────────────────
function ResultRow({ result, file, onEdit, editingKey, onSaveEdit, onCancelEdit, contextLines, query, onSelectFile }) {
  const [hov, setHov] = React.useState(false)
  const key       = `${result.path}:${result.line}`
  const isEditing = editingKey === key
  const canEdit   = result.line && file && file.content

  // Context lines (before/after)
  const allLines = file?.content?.split("\n") || []
  const lineIdx  = result.line - 1
  const ctxBefore = contextLines > 0
    ? allLines.slice(Math.max(0, lineIdx - contextLines), lineIdx)
        .map((t, i) => ({ num: lineIdx - contextLines + i + 1, text: t, isMatch: false }))
    : []
  const ctxAfter  = contextLines > 0
    ? allLines.slice(lineIdx + 1, lineIdx + 1 + contextLines)
        .map((t, i) => ({ num: lineIdx + 2 + i, text: t, isMatch: false }))
    : []

  // Find match range in snippet for highlighting
  const snippet = result.snippet || ""
  const qLower  = query.toLowerCase()
  const matchIdx = snippet.toLowerCase().indexOf(qLower)
  const matchStart = matchIdx >= 0 ? matchIdx : null
  const matchEnd   = matchStart != null ? matchStart + qLower.length : null

  const renderLine = (text, num, isMatch, isMatchLine) => {
    const spans = tokenize(text, isMatchLine ? matchStart : null, isMatchLine ? matchEnd : null, query)
    return (
      <div
        key={num}
        style={{
          display: "flex", alignItems: "center",
          background: isMatchLine ? T.codeHl : "transparent",
          borderLeft: isMatchLine ? `2px solid ${T.brand}` : "2px solid transparent",
          padding: "1px 0",
        }}
      >
        <span style={{ width: 36, textAlign: "right", paddingRight: 10, color: T.codeNum, fontSize: 10.5, fontFamily: "monospace", flexShrink: 0, userSelect: "none" }}>
          {num}
        </span>
        <code style={{ fontSize: 11.5, fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {spans.map((sp, si) => (
            <span key={si} style={{
              color: sp.color,
              background: sp.isMatch ? `${T.brand}30` : "transparent",
              borderRadius: sp.isMatch ? 2 : 0,
              fontWeight: sp.isMatch ? 700 : 400,
            }}>
              {sp.text}
            </span>
          ))}
        </code>
        {isMatchLine && canEdit && (hov || isEditing) && (
          <button
            onClick={e => { e.stopPropagation(); onEdit(key) }}
            style={{ background: isEditing ? T.orangeLight : T.tealLight, border: `1px solid ${isEditing ? T.orangeBorder : T.tealBorder}`, borderRadius: 5, color: isEditing ? T.orange : T.teal, padding: "2px 9px", fontSize: 10, cursor: "pointer", fontFamily: "monospace", flexShrink: 0, marginRight: 8 }}>
            {isEditing ? "editing…" : "✏ edit"}
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => { if (file) onSelectFile(file) }}
      style={{
        background: T.codeBg, borderRadius: T.r, cursor: "pointer",
        overflow: "hidden",
        border: `1px solid ${hov ? T.borderHover : "transparent"}`,
        transition: "border-color 0.1s",
        margin: "3px 0",
      }}
    >
      {ctxBefore.map(l => renderLine(l.text, l.num, false, false))}
      {result.line && renderLine(snippet || "", result.line, true, true)}
      {ctxAfter.map(l  => renderLine(l.text, l.num, false, false))}
      {isEditing && file && (
        <InlineEditor file={file} lineNumber={result.line} onSave={onSaveEdit} onCancel={onCancelEdit} />
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const findFile = (files, resultPath) => {
  if (!resultPath) return null
  const norm = p => p.replace(/\\/g, "/")
  return files.find(f => norm(f.path) === norm(resultPath))
    || files.find(f => { const nf = norm(f.path), nr = norm(resultPath); return nf.endsWith(nr) || nr.endsWith(nf) })
    || null
}

const EXT_COLORS = { jsx: T.teal, js: T.orange, tsx: T.blue, ts: T.blue, css: "#8b5cf6", json: T.green }
const getExtColor = ext => EXT_COLORS[ext] || T.textHint

// ── Main CodeSearch ───────────────────────────────────────────────────────────
export default function CodeSearch() {
  const [query,        setQuery]        = React.useState("")
  const [results,      setResults]      = React.useState([])
  const [editingKey,   setEditingKey]   = React.useState(null)
  const [toast,        setToast]        = React.useState(null)
  const [extFilter,    setExtFilter]    = React.useState(null)   // task 15
  const [contextLines, setContextLines] = React.useState(0)     // task 16
  const { files, setFiles, selectFile } = useProjectStore()
  const inputRef = React.useRef()

  // Task 17: Cmd/Ctrl+K to focus search
  React.useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) setResults(search(query))
      else setResults([])
    }, 180)
    return () => clearTimeout(t)
  }, [query])

  const grouped = React.useMemo(() => {
    const map = {}
    for (const r of results) { if (!map[r.path]) map[r.path] = []; map[r.path].push(r) }
    return map
  }, [results])

  // Available extensions from results (task 15)
  const availableExts = React.useMemo(() => {
    const exts = new Set()
    for (const path of Object.keys(grouped)) {
      const ext = path.split(".").pop()?.toLowerCase()
      if (ext) exts.add(ext)
    }
    return [...exts].sort()
  }, [grouped])

  const filteredGrouped = React.useMemo(() => {
    if (!extFilter) return grouped
    return Object.fromEntries(
      Object.entries(grouped).filter(([path]) => path.toLowerCase().endsWith("." + extFilter))
    )
  }, [grouped, extFilter])

  const totalMatches = Object.values(filteredGrouped).reduce((a, v) => a + v.length, 0)

  const handleSaveEdit = (newContent, lineNumber, file) => {
    setFiles(files.map(f => f.path === file.path ? { ...f, content: newContent, lines: newContent.split("\n").length } : f))
    setEditingKey(null)
    setToast(`Line ${lineNumber} updated in ${(file.path || "").split(/[/\\]/).pop()}`)
    if (query.trim()) setTimeout(() => setResults(search(query)), 50)
  }

  // Task 14: clicking a result sets selectedFile in store
  const handleSelectFile = React.useCallback((file) => {
    selectFile(file)
  }, [selectFile])

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Search bar */}
      <div style={{ position: "sticky", top: 0, background: T.bg, paddingBottom: 10, zIndex: 10 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: T.textHint, fontSize: 14 }}>⌕</span>
          <input
            ref={inputRef}
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="search files, symbols, content…"
            style={{
              width: "100%", background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: T.rMd, color: T.text, padding: "10px 80px 10px 38px",
              fontSize: 12.5, outline: "none", fontFamily: "monospace", boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = T.brand}
            onBlur={e  => e.target.style.borderColor = T.border}
          />
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 6 }}>
            {query && <span style={{ fontSize: 11, color: T.textHint }}>{totalMatches} result{totalMatches !== 1 ? "s" : ""}</span>}
            <span style={{
              fontSize: 10, color: T.textHint, background: T.surfaceAlt,
              border: `1px solid ${T.border}`, borderRadius: 4, padding: "2px 6px",
              fontFamily: "monospace",
            }}>⌘K</span>
          </div>
        </div>

        {/* Task 15: Extension filter chips */}
        {availableExts.length > 1 && (
          <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: T.textHint, fontFamily: "monospace" }}>filter:</span>
            <button
              onClick={() => setExtFilter(null)}
              style={{
                padding: "3px 10px", borderRadius: 12, fontSize: 10, cursor: "pointer", fontFamily: "monospace",
                border: `1px solid ${!extFilter ? T.brand : T.border}`,
                background: !extFilter ? T.brandLight : "transparent",
                color: !extFilter ? T.brand : T.textHint,
              }}
            >all</button>
            {availableExts.map(ext => (
              <button
                key={ext}
                onClick={() => setExtFilter(f => f === ext ? null : ext)}
                style={{
                  padding: "3px 10px", borderRadius: 12, fontSize: 10, cursor: "pointer", fontFamily: "monospace",
                  border: `1px solid ${extFilter === ext ? getExtColor(ext) : T.border}`,
                  background: extFilter === ext ? `${getExtColor(ext)}18` : "transparent",
                  color: extFilter === ext ? getExtColor(ext) : T.textHint,
                }}
              >.{ext}</button>
            ))}

            {/* Task 16: Context lines control */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: T.textHint, fontFamily: "monospace" }}>context:</span>
              {[0, 1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => setContextLines(n)}
                  style={{
                    width: 24, height: 22, borderRadius: 4, fontSize: 10, cursor: "pointer", fontFamily: "monospace",
                    border: `1px solid ${contextLines === n ? T.brand : T.border}`,
                    background: contextLines === n ? T.brandLight : "transparent",
                    color: contextLines === n ? T.brand : T.textHint,
                  }}
                >{n}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!query && (
        <div style={{ textAlign: "center", marginTop: 60, color: T.textHint, fontSize: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⌕</div>
          type to search across all files
          <div style={{ marginTop: 8, fontSize: 11 }}>
            press <span style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 4, padding: "1px 6px", fontFamily: "monospace" }}>⌘K</span> from anywhere to focus
          </div>
        </div>
      )}

      {query && totalMatches === 0 && (
        <div style={{ textAlign: "center", marginTop: 60, color: T.textHint, fontSize: 12 }}>
          no results for "{query}"{extFilter ? ` in .${extFilter} files` : ""}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto" }}>
        {Object.entries(filteredGrouped).map(([filePath, fileResults]) => {
          const file     = findFile(files, filePath)
          const fName    = filePath.split(/[/\\]/).pop()
          const dir      = filePath.split(/[/\\]/).slice(0, -1).join("/")
          const ext      = (fName.split(".").pop() || "").toLowerCase()
          const extUpper = ext.toUpperCase()

          return (
            <div key={filePath} style={{ marginBottom: 10, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rMd, overflow: "hidden" }}>
              {/* File header */}
              <div
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: T.surfaceAlt, borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}
                onClick={() => file && handleSelectFile(file)}
              >
                <span style={{ background: `${getExtColor(ext)}18`, border: `1px solid ${getExtColor(ext)}44`, borderRadius: 4, color: getExtColor(ext), fontSize: 9, padding: "2px 6px", fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0 }}>
                  {extUpper}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{fName}</span>
                <span style={{ fontSize: 11, color: T.textHint, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>./{dir}</span>
                <span style={{ background: T.pinkLight, border: `1px solid ${T.pinkBorder}`, borderRadius: 10, color: T.pink, fontSize: 10, padding: "2px 8px", flexShrink: 0 }}>
                  {fileResults.length} match{fileResults.length !== 1 ? "es" : ""}
                </span>
              </div>

              <div style={{ padding: "4px 6px", background: T.codeBg }}>
                {fileResults.map((r, i) => {
                  const key = `${r.path}:${r.line}`
                  return (
                    <ResultRow
                      key={i}
                      result={r}
                      file={file}
                      query={query}
                      editingKey={editingKey}
                      contextLines={contextLines}
                      onEdit={k => setEditingKey(p => p === k ? null : k)}
                      onSaveEdit={(nc, ln) => handleSaveEdit(nc, ln, file)}
                      onCancelEdit={() => setEditingKey(null)}
                      onSelectFile={handleSelectFile}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
