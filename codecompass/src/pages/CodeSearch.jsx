import React from "react"
import { search } from "../services/searchService"
import { useProjectStore } from "../state/projectStore"
import { T } from "../theme"

function Toast({ message, onDone }) {
  React.useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t) }, [])
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24,
      background: T.greenLight, border: `1px solid ${T.greenBorder}`,
      borderRadius: T.rMd, padding: "10px 18px",
      color: T.green, fontSize: 12, fontFamily: "monospace", fontWeight: 600,
      zIndex: 2000
    }}>
      ✓ {message}
    </div>
  )
}

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
    <div style={{
      margin: "4px 0 8px", background: T.tealLight,
      border: `1px solid ${T.tealBorder}`, borderRadius: T.rMd, overflow: "hidden"
    }}>
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
        <button onClick={onCancel} style={{ padding: "5px 12px", background: "none", border: `1px solid ${T.border}`, borderRadius: T.r, color: T.textSub, fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>
          cancel
        </button>
      </div>
    </div>
  )
}

function ResultRow({ result, file, onEdit, editingKey, onSaveEdit, onCancelEdit }) {
  const [hov, setHov] = React.useState(false)
  const key      = `${result.path}:${result.line}`
  const isEditing = editingKey === key
  const canEdit   = result.line && file && file.content

  return (
    <div>
      <div
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ display: "flex", alignItems: "center", padding: "6px 12px", gap: 8, background: hov ? T.surfaceAlt : "transparent", borderRadius: T.r, cursor: "default", transition: "background 0.1s" }}
      >
        {result.line && (
          <span style={{ background: T.tealLight, border: `1px solid ${T.tealBorder}`, borderRadius: 4, color: T.teal, fontSize: 10, padding: "1px 6px", fontFamily: "monospace", flexShrink: 0 }}>
            L{result.line}
          </span>
        )}
        <span style={{ fontSize: 11.5, color: T.text, fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {result.snippet || <span style={{ color: T.textHint }}>filename match</span>}
        </span>
        {canEdit && (hov || isEditing) && (
          <button onClick={() => onEdit(key)} style={{ background: isEditing ? T.orangeLight : T.tealLight, border: `1px solid ${isEditing ? T.orangeBorder : T.tealBorder}`, borderRadius: 5, color: isEditing ? T.orange : T.teal, padding: "2px 9px", fontSize: 10, cursor: "pointer", fontFamily: "monospace", flexShrink: 0 }}>
            {isEditing ? "editing…" : "✏ edit"}
          </button>
        )}
      </div>
      {isEditing && file && (
        <InlineEditor file={file} lineNumber={result.line} onSave={onSaveEdit} onCancel={onCancelEdit} />
      )}
    </div>
  )
}

const findFile = (files, resultPath) => {
  if (!resultPath) return null
  const norm = p => p.replace(/\\/g, "/")
  return files.find(f => norm(f.path) === norm(resultPath))
    || files.find(f => { const nf = norm(f.path), nr = norm(resultPath); return nf.endsWith(nr) || nr.endsWith(nf) })
    || null
}

export default function CodeSearch() {
  const [query,      setQuery]      = React.useState("")
  const [results,    setResults]    = React.useState([])
  const [editingKey, setEditingKey] = React.useState(null)
  const [toast,      setToast]      = React.useState(null)
  const { files, setFiles } = useProjectStore()

  React.useEffect(() => {
    const t = setTimeout(() => { if (query.trim()) setResults(search(query)); else setResults([]) }, 200)
    return () => clearTimeout(t)
  }, [query])

  const grouped = React.useMemo(() => {
    const map = {}
    for (const r of results) { if (!map[r.path]) map[r.path] = []; map[r.path].push(r) }
    return map
  }, [results])

  const handleSaveEdit = (newContent, lineNumber, file) => {
    setFiles(files.map(f => f.path === file.path ? { ...f, content: newContent, lines: newContent.split("\n").length } : f))
    setEditingKey(null)
    setToast(`Line ${lineNumber} updated in ${(file.path || "").split(/[/\\]/).pop()}`)
    if (query.trim()) setTimeout(() => setResults(search(query)), 50)
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Search bar */}
      <div style={{ position: "sticky", top: 0, background: T.bg, paddingBottom: 14, zIndex: 10 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: T.textHint, fontSize: 14 }}>⌕</span>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="search files, symbols, content…"
            style={{
              width: "100%", background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: T.rMd, color: T.text, padding: "10px 14px 10px 38px",
              fontSize: 12.5, outline: "none", fontFamily: "monospace", boxSizing: "border-box",
              transition: "border-color 0.15s"
            }}
            onFocus={e => e.target.style.borderColor = T.brand}
            onBlur={e  => e.target.style.borderColor = T.border}
          />
          {query && (
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: T.textHint }}>
              {results.length} results
            </span>
          )}
        </div>
      </div>

      {!query && (
        <div style={{ textAlign: "center", marginTop: 60, color: T.textHint, fontSize: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⌕</div>
          type to search across all files
        </div>
      )}

      {query && results.length === 0 && (
        <div style={{ textAlign: "center", marginTop: 60, color: T.textHint, fontSize: 12 }}>
          no results for "{query}"
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto" }}>
        {Object.entries(grouped).map(([filePath, fileResults]) => {
          const file     = findFile(files, filePath)
          const fileName = filePath.split(/[/\\]/).pop()
          const dir      = filePath.split(/[/\\]/).slice(0, -1).join("/")
          const ext      = (fileName.split(".").pop() || "").toUpperCase()

          return (
            <div key={filePath} style={{ marginBottom: 10, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rMd, overflow: "hidden" }}>
              {/* File header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: T.surfaceAlt, borderBottom: `1px solid ${T.border}` }}>
                <span style={{ background: T.tealLight, border: `1px solid ${T.tealBorder}`, borderRadius: 4, color: T.teal, fontSize: 9, padding: "2px 6px", fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0 }}>
                  {ext}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{fileName}</span>
                <span style={{ fontSize: 11, color: T.textHint, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>./{dir}</span>
                <span style={{ background: T.pinkLight, border: `1px solid ${T.pinkBorder}`, borderRadius: 10, color: T.pink, fontSize: 10, padding: "2px 8px", flexShrink: 0 }}>
                  {fileResults.length} match{fileResults.length !== 1 ? "es" : ""}
                </span>
              </div>
              <div style={{ padding: "3px 0" }}>
                {fileResults.map((r, i) => {
                  const key = `${r.path}:${r.line}`
                  return (
                    <ResultRow key={i} result={r} file={file} editingKey={editingKey}
                      onEdit={k => setEditingKey(p => p === k ? null : k)}
                      onSaveEdit={(nc, ln) => handleSaveEdit(nc, ln, file)}
                      onCancelEdit={() => setEditingKey(null)}
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