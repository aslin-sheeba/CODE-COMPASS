import React from "react"

const C = {
  bg: "#0a0c0f",
  surface: "#111318",
  border: "#1e2330",
  borderHover: "#2a3040",
  cyan: "#00e5ff",
  violet: "#9c6fff",
  green: "#00e676",
  red: "#ff4444",
  amber: "#ffb300",
  text: "#e2e8f0",
  muted: "#64748b",
  inputBg: "#0d1117",
}

export default function GitHubImportModal({ onClose, onImport }) {
  const [repoUrl, setRepoUrl] = React.useState("")
  const [token, setToken] = React.useState("")
  const [showToken, setShowToken] = React.useState(false)
  const [branches, setBranches] = React.useState([])
  const [selectedBranch, setSelectedBranch] = React.useState("")
  const [fetchingBranches, setFetchingBranches] = React.useState(false)
  const [cloning, setCloning] = React.useState(false)
  const [progress, setProgress] = React.useState(null) // { message, phase }
  const [error, setError] = React.useState("")
  const [repoInfo, setRepoInfo] = React.useState(null) // { owner, repo }

  // ── Listen for clone progress events ──────────────────────────────────────
  React.useEffect(() => {
    if (window.electronAPI?.onCloneProgress) {
      window.electronAPI.onCloneProgress((data) => {
        setProgress(data)
      })
    }
  }, [])

  // ── Fetch branches when URL is entered ────────────────────────────────────
  const handleFetchBranches = async () => {
    if (!repoUrl.trim()) return
    setError("")
    setFetchingBranches(true)
    setBranches([])
    setSelectedBranch("")
    setRepoInfo(null)

    const result = await window.electronAPI.getGitHubBranches({
      repoUrl: repoUrl.trim(),
      token: token.trim() || null
    })

    setFetchingBranches(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setBranches(result.branches)
    setRepoInfo({ owner: result.owner, repo: result.repo })
    setSelectedBranch(
      result.branches.includes("main") ? "main" :
      result.branches.includes("master") ? "master" :
      result.branches[0] || ""
    )
  }

  // ── Clone ─────────────────────────────────────────────────────────────────
  const handleClone = async () => {
    if (!repoUrl.trim() || !selectedBranch) return
    setError("")
    setCloning(true)
    setProgress({ message: "Starting clone...", phase: "cloning" })

    const result = await window.electronAPI.cloneFromGitHub({
      repoUrl: repoUrl.trim(),
      branch: selectedBranch,
      token: token.trim() || null
    })

    setCloning(false)

    if (result.error) {
      setError(result.error)
      setProgress(null)
      return
    }

    setProgress({ message: "Done! Loading project...", phase: "done" })

    setTimeout(() => {
      onImport(result.files)
      onClose()
    }, 600)
  }

  // ── Phase → color ─────────────────────────────────────────────────────────
  const phaseColor = {
    cloning: C.amber,
    scanning: C.cyan,
    done: C.green,
  }

  const phaseIcon = {
    cloning: "⬇️",
    scanning: "🔍",
    done: "✅",
  }

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          width: 520,
          padding: "28px 32px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,229,255,0.05)",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🐙</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: "-0.5px" }}>
              Import from GitHub
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: C.muted, fontSize: 20, lineHeight: 1,
              padding: "2px 6px", borderRadius: 6,
              transition: "color 0.15s",
            }}
            onMouseEnter={e => e.target.style.color = C.text}
            onMouseLeave={e => e.target.style.color = C.muted}
          >×</button>
        </div>

        {/* Repo URL row */}
        <label style={{ display: "block", marginBottom: 6, fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Repository
        </label>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            value={repoUrl}
            onChange={e => { setRepoUrl(e.target.value); setBranches([]); setError("") }}
            onKeyDown={e => e.key === "Enter" && handleFetchBranches()}
            placeholder="facebook/react  or  https://github.com/owner/repo"
            disabled={cloning}
            style={{
              flex: 1,
              background: C.inputBg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.text,
              padding: "10px 14px",
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
              transition: "border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = C.cyan}
            onBlur={e => e.target.style.borderColor = C.border}
          />
          <button
            onClick={handleFetchBranches}
            disabled={!repoUrl.trim() || fetchingBranches || cloning}
            style={{
              background: fetchingBranches ? C.border : `linear-gradient(135deg, ${C.cyan}22, ${C.cyan}11)`,
              border: `1px solid ${fetchingBranches ? C.border : C.cyan}`,
              borderRadius: 8,
              color: fetchingBranches ? C.muted : C.cyan,
              padding: "10px 16px",
              fontSize: 12,
              cursor: !repoUrl.trim() || fetchingBranches || cloning ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
            }}
          >
            {fetchingBranches ? "Loading..." : "Get Branches"}
          </button>
        </div>

        {/* Repo info badge */}
        {repoInfo && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: `${C.violet}15`, border: `1px solid ${C.violet}40`,
            borderRadius: 6, padding: "4px 10px", marginBottom: 16,
            fontSize: 12, color: C.violet,
          }}>
            📦 {repoInfo.owner} / <strong>{repoInfo.repo}</strong>
            <span style={{ color: C.muted }}>· {branches.length} branch{branches.length !== 1 ? "es" : ""}</span>
          </div>
        )}

        {/* Branch selector */}
        {branches.length > 0 && (
          <>
            <label style={{ display: "block", marginBottom: 6, fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Branch
            </label>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              disabled={cloning}
              style={{
                width: "100%",
                background: C.inputBg,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.text,
                padding: "10px 14px",
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
                marginBottom: 16,
                cursor: "pointer",
              }}
            >
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </>
        )}

        {/* PAT field */}
        <label style={{ display: "block", marginBottom: 6, fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Personal Access Token <span style={{ color: C.border, fontWeight: 400 }}>(optional · private repos)</span>
        </label>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            type={showToken ? "text" : "password"}
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            disabled={cloning}
            style={{
              flex: 1,
              background: C.inputBg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.text,
              padding: "10px 14px",
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
              transition: "border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = C.violet}
            onBlur={e => e.target.style.borderColor = C.border}
          />
          <button
            onClick={() => setShowToken(v => !v)}
            style={{
              background: C.inputBg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.muted,
              padding: "10px 12px",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {showToken ? "🙈" : "👁️"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: `${C.red}15`,
            border: `1px solid ${C.red}50`,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
            color: C.red,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Progress */}
        {progress && (
          <div style={{
            background: `${phaseColor[progress.phase] || C.cyan}12`,
            border: `1px solid ${phaseColor[progress.phase] || C.cyan}40`,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
            color: phaseColor[progress.phase] || C.cyan,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>{phaseIcon[progress.phase] || "⏳"}</span>
            <span>{progress.message}</span>
            {cloning && progress.phase !== "done" && (
              <span style={{ marginLeft: "auto", opacity: 0.6, fontSize: 11 }}>
                {[...Array(3)].map((_, i) => (
                  <span key={i} style={{
                    display: "inline-block",
                    animation: `pulse 1.2s ${i * 0.3}s infinite`,
                  }}>·</span>
                ))}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={cloning}
            style={{
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.muted,
              padding: "10px 20px",
              fontSize: 13,
              cursor: cloning ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { if (!cloning) e.target.style.borderColor = C.borderHover; e.target.style.color = C.text }}
            onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.muted }}
          >
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={!selectedBranch || cloning}
            style={{
              background: selectedBranch && !cloning
                ? `linear-gradient(135deg, ${C.cyan}, ${C.cyan}99)`
                : C.border,
              border: "none",
              borderRadius: 8,
              color: selectedBranch && !cloning ? "#000" : C.muted,
              padding: "10px 24px",
              fontSize: 13,
              fontWeight: 700,
              cursor: !selectedBranch || cloning ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
              letterSpacing: "0.02em",
            }}
          >
            {cloning ? "Cloning..." : "⬇ Clone & Import"}
          </button>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.4); }
          }
        `}</style>
      </div>
    </div>
  )
}