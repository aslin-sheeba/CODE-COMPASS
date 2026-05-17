import React from "react"
import { T } from "../theme"

export default function CodeEditor({ file, onClose, onSave }) {
  const [content, setContent] = React.useState(file?.content || "")
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveStatus, setSaveStatus] = React.useState(null)
  const textareaRef = React.useRef()

  if (!file) return null

  const fileName = file.path.split(/[\\/]/).pop()
  const fileExt = fileName.match(/\.[^.]+$/)?.[0] || ""

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus(null)
    try {
      // Use savePath if available (realPath), otherwise use regular path
      const pathToSave = file.savePath || file.realPath || file.path
      console.log("Saving file to:", pathToSave)
      
      // Ensure electronAPI is available
      if (!window.electronAPI?.writeFile) {
        throw new Error("Electron API not available")
      }

      // Call the write handler
      const result = await window.electronAPI.writeFile(pathToSave, content)
      
      console.log("Save result:", result)
      
      if (result?.error) {
        setSaveStatus("error")
        console.error("Save error:", result.error)
      } else {
        setSaveStatus("saved")
        if (onSave) onSave(pathToSave, content)
      }
    } catch (err) {
      setSaveStatus("error")
      console.error("Failed to save file:", err)
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault()
      handleSave()
    }
    if (e.key === "Tab") {
      e.preventDefault()
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      const newContent = content.substring(0, start) + "\t" + content.substring(end)
      setContent(newContent)
      setTimeout(() => {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1
      }, 0)
    }
  }

  const lineCount = content.split("\n").length
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join("\n")

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        background: T.surface,
        borderRadius: T.rMd,
        border: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        width: "90vw",
        height: "90vh",
        maxWidth: 1200,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: `1px solid ${T.border}`,
          background: T.surfaceAlt,
          borderRadius: `${T.rMd} ${T.rMd} 0 0`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontFamily: "monospace", color: T.textHint }}>
              📝
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: "monospace" }}>
              {fileName}
            </span>
            <span style={{ fontSize: 10, color: T.textHint, fontFamily: "monospace" }}>
              {fileExt}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {saveStatus === "saved" && (
              <span style={{ fontSize: 10, color: T.green, fontFamily: "monospace" }}>
                ✓ Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span style={{ fontSize: 10, color: T.red, fontFamily: "monospace" }}>
                ✗ Error saving
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: "6px 12px",
                borderRadius: T.r,
                border: `1px solid ${T.brandBorder}`,
                background: T.brandLight,
                color: T.brand,
                cursor: isSaving ? "not-allowed" : "pointer",
                fontSize: 11,
                fontFamily: "monospace",
                fontWeight: 600,
                opacity: isSaving ? 0.6 : 1
              }}
            >
              {isSaving ? "Saving..." : "Save (Ctrl+S)"}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "6px 12px",
                borderRadius: T.r,
                border: `1px solid ${T.border}`,
                background: "transparent",
                color: T.textSub,
                cursor: "pointer",
                fontSize: 11,
                fontFamily: "monospace"
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          background: T.codeBg
        }}>
          {/* Line Numbers */}
          <div style={{
            background: T.surfaceAlt,
            borderRight: `1px solid ${T.border}`,
            padding: "12px 8px",
            overflowY: "hidden",
            userSelect: "none",
            minWidth: 50,
            textAlign: "right"
          }}>
            <pre style={{
              margin: 0,
              fontSize: 11,
              lineHeight: 1.6,
              color: T.textHint,
              fontFamily: "monospace",
              whiteSpace: "pre"
            }}>
              {lineNumbers}
            </pre>
          </div>

          {/* Text Editor */}
          <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: "100%",
                height: "100%",
                padding: "12px",
                border: "none",
                outline: "none",
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: 11,
                lineHeight: 1.6,
                color: T.codeText,
                background: T.codeBg,
                resize: "none",
                boxSizing: "border-box",
                tabSize: 2
              }}
              spellCheck="false"
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderTop: `1px solid ${T.border}`,
          background: T.surfaceAlt,
          fontSize: 10,
          color: T.textHint,
          fontFamily: "monospace"
        }}>
          <div>
            Line {content.substring(0, textareaRef.current?.selectionStart || 0).split("\n").length} · 
            Column {(textareaRef.current?.selectionStart || 0) - content.lastIndexOf("\n", textareaRef.current?.selectionStart || 0)}
          </div>
          <div>
            {content.length} characters · {lineCount} lines
          </div>
        </div>
      </div>
    </div>
  )
}
