// src/components/Dashboard/QuickActions.jsx
// Toolbar with one-click actions: worst file, unused files, AI, last session.
import React from "react"
import { useProjectStore } from "../../state/projectStore"
import { T } from "../../theme"

function Btn({ label, icon, color, bg, border, onClick, title }) {
  const [hov, setHov] = React.useState(false)
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "5px 12px", borderRadius: T.r,
        fontSize: 11, fontFamily: "monospace", cursor: "pointer",
        border: `1px solid ${border || T.border}`,
        background: hov ? (bg || T.surfaceAlt) : T.surface,
        color: color || T.textSub,
        transition: "background 0.1s",
        whiteSpace: "nowrap",
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export default function QuickActions({ onNavigate, onSelectFile, resumeInfo }) {
  const { files, selectFile } = useProjectStore()

  const goWorstFile = React.useCallback(() => {
    if (!files.length) return
    const worst = files.reduce((a, b) =>
      (b._meta?.stressScore || 0) > (a._meta?.stressScore || 0) ? b : a
    )
    selectFile(worst)
    onSelectFile?.(worst)
  }, [files, selectFile, onSelectFile])

  const goUnused = React.useCallback(() => {
    onNavigate?.("lens")
  }, [onNavigate])

  const goAI = React.useCallback(() => {
    onNavigate?.("ai")
  }, [onNavigate])

  const goOnboarding = React.useCallback(() => {
    onNavigate?.("onboarding")
  }, [onNavigate])

  if (!files.length) return null

  return (
    <div style={{
      display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap",
      padding: "6px 16px", borderBottom: `1px solid ${T.border}`,
      background: T.surfaceAlt,
    }}>
      <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, fontWeight: 600, marginRight: 4 }}>
        Quick actions
      </span>

      <Btn icon="🔥" label="Worst file"
        title="Open the file with the highest stress score"
        color={T.red} border={T.redBorder}
        onClick={goWorstFile} />

      <Btn icon="👻" label="Find unused"
        title="Navigate to Dependency Lens to find unused files"
        color={T.orange} border={T.orangeBorder}
        onClick={goUnused} />

      <Btn icon="🤖" label="Ask AI"
        title="Open the AI assistant"
        color="#8b5cf6" border="#d8b4fe"
        onClick={goAI} />

      <Btn icon="📋" label="Onboarding guide"
        title="Open the developer onboarding guide"
        color={T.teal} border={T.tealBorder}
        onClick={goOnboarding} />

      {/* Resume hint if session was restored */}
      {resumeInfo && (
        <div style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 5,
          fontSize: 10, color: T.textHint, fontFamily: "monospace",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.teal, display: "inline-block" }} />
          Resumed · {resumeInfo}
        </div>
      )}
    </div>
  )
}
