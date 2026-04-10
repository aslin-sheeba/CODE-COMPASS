import React from "react"
import { T } from "../theme"

// ── Error categoriser ─────────────────────────────────────────────────────────
function categoriseError(raw = "") {
  const msg = raw.toLowerCase()
  if (msg.includes("rate limit"))
    return { title: "GitHub rate limit hit", hint: "Wait a few minutes, or add a Personal Access Token to increase your quota.", icon: "⏳" }
  if (msg.includes("not found") || msg.includes("404"))
    return { title: "Repository not found", hint: "Check the owner/repo slug is correct and the repo is public (or you have a token for private repos).", icon: "🔍" }
  if (msg.includes("authentication") || msg.includes("401") || msg.includes("403"))
    return { title: "Authentication failed", hint: "Your Personal Access Token may be expired or missing the `repo` scope.", icon: "🔑" }
  if (msg.includes("network") || msg.includes("enotfound") || msg.includes("fetch"))
    return { title: "Network error", hint: "Check your internet connection and try again.", icon: "📡" }
  if (msg.includes("clone") || msg.includes("git"))
    return { title: "Clone failed", hint: "The repository may be too large or git is not available. Try a different branch.", icon: "📦" }
  if (msg.includes("no branches"))
    return { title: "No branches found", hint: "The repository may be empty or you may need a token to list its branches.", icon: "🌿" }
  return { title: "Something went wrong", hint: raw || "An unexpected error occurred.", icon: "⚠️" }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ErrorBanner({ error, onRetry }) {
  if (!error) return null
  const { title, hint, icon } = categoriseError(error)
  return (
    <div style={{
      marginBottom: 14, borderRadius: T.r,
      background: T.redLight, border: `1px solid ${T.redBorder}`,
      borderLeft: `3px solid ${T.red}`, overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.red, marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.5 }}>{hint}</div>
        </div>
        {onRetry && (
          <button onClick={onRetry} style={{
            padding: "5px 10px", background: T.surface,
            border: `1px solid ${T.redBorder}`, borderRadius: T.r,
            color: T.red, fontSize: 11, cursor: "pointer", fontFamily: "monospace",
            flexShrink: 0,
          }}>retry</button>
        )}
      </div>
    </div>
  )
}

function ProgressBanner({ progress, cloning }) {
  if (!progress || !cloning) return null
  const pct = progress.percent != null ? Math.round(progress.percent) : null
  return (
    <div style={{
      marginBottom: 14, borderRadius: T.r,
      background: T.tealLight, border: `1px solid ${T.tealBorder}`,
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
        <span style={{ fontSize: 14 }}>⏳</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.teal, fontFamily: "monospace", marginBottom: pct != null ? 6 : 0 }}>
            {progress.message}
          </div>
          {pct != null && (
            <div style={{ height: 4, background: T.brandBorder, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", background: T.brand, width: `${pct}%`, transition: "width 0.3s ease", borderRadius: 2 }} />
            </div>
          )}
        </div>
        {pct != null && (
          <span style={{ fontSize: 11, color: T.teal, fontFamily: "monospace", flexShrink: 0 }}>{pct}%</span>
        )}
      </div>
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 9, color: T.textHint, letterSpacing: "0.1em",
      textTransform: "uppercase", marginBottom: 6, fontWeight: 600,
    }}>{children}</div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function GitHubImportModal({ onClose, onImport }) {
  const [repoUrl,          setRepoUrl]          = React.useState("")
  const [token,            setToken]            = React.useState("")
  const [showToken,        setShowToken]        = React.useState(false)
  const [branches,         setBranches]         = React.useState([])
  const [selectedBranch,   setSelectedBranch]   = React.useState("")
  const [fetchingBranches, setFetchingBranches] = React.useState(false)
  const [cloning,          setCloning]          = React.useState(false)
  const [progress,         setProgress]         = React.useState(null)
  const [error,            setError]            = React.useState("")
  const [repoInfo,         setRepoInfo]         = React.useState(null)

  React.useEffect(() => {
    if (window.electronAPI?.onCloneProgress) {
      window.electronAPI.onCloneProgress((data) => setProgress(data))
    }
  }, [])

  // Close on Escape
  React.useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const handleFetchBranches = async () => {
    const url = repoUrl.trim()
    if (!url) { setError("Please enter a repository URL or owner/repo."); return }
    setError(""); setFetchingBranches(true); setBranches([]); setSelectedBranch(""); setRepoInfo(null)

    try {
      const result = await window.electronAPI.getGitHubBranches({ repoUrl: url, token: token.trim() || null })
      if (result.error) { setError(result.error); return }
      if (!result.branches?.length) { setError("No branches found in this repository."); return }
      setBranches(result.branches)
      setSelectedBranch(result.branches[0] || "")
      setRepoInfo({ owner: result.owner, repo: result.repo })
    } catch (e) {
      setError(e?.message || "Failed to fetch branches.")
    } finally {
      setFetchingBranches(false)
    }
  }

  const handleClone = async () => {
    if (!selectedBranch) return
    setError(""); setCloning(true)
    setProgress({ message: "Starting clone…", phase: "cloning" })

    try {
      const result = await window.electronAPI.cloneFromGitHub({
        repoUrl: repoUrl.trim(), branch: selectedBranch, token: token.trim() || null,
      })
      if (result.error) { setError(result.error); setProgress(null); return }
      onImport(result.files)
    } catch (e) {
      setError(e?.message || "Clone failed unexpectedly.")
      setProgress(null)
    } finally {
      setCloning(false)
    }
  }

  const handleRetry = () => {
    setError("")
    if (!branches.length) handleFetchBranches()
    else handleClone()
  }

  const inputStyle = {
    flex: 1, padding: "10px 14px",
    background: T.overlay, border: "1px solid #333",
    borderRadius: T.r, color: "#fff",
    fontFamily: "monospace", fontSize: 13, outline: "none",
    transition: "border-color 0.15s",
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: "#1a1a1a", borderRadius: T.rLg, width: 460, padding: 28, border: "1px solid #2a2a2a", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 3 }}>Clone from GitHub</div>
            <div style={{ fontSize: 11, color: "#666" }}>Import any public or private repository</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: 18, cursor: "pointer", padding: "4px 8px" }}>✕</button>
        </div>

        {/* Repository field */}
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>repository</FieldLabel>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={repoUrl}
              onChange={e => { setRepoUrl(e.target.value); setError("") }}
              placeholder="facebook/react  or  https://github.com/…"
              onKeyDown={e => e.key === "Enter" && handleFetchBranches()}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = T.brand}
              onBlur={e  => e.target.style.borderColor = "#333"}
            />
            <button
              onClick={handleFetchBranches}
              disabled={fetchingBranches || cloning}
              style={{
                padding: "10px 16px", borderRadius: T.r,
                background: fetchingBranches ? "#333" : T.brand,
                color: "#fff", border: "none",
                fontSize: 12, cursor: fetchingBranches ? "not-allowed" : "pointer",
                fontFamily: "monospace", fontWeight: 600, flexShrink: 0,
              }}
            >
              {fetchingBranches ? "…" : "fetch"}
            </button>
          </div>
        </div>

        {/* Token */}
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>personal access token (optional — for private repos)</FieldLabel>
          <div style={{ position: "relative" }}>
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxx"
              style={{ ...inputStyle, width: "100%", paddingRight: 44, boxSizing: "border-box" }}
            />
            <button
              onClick={() => setShowToken(s => !s)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 13 }}
            >
              {showToken ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {/* Repo info */}
        {repoInfo && (
          <div style={{ marginBottom: 14, padding: "8px 12px", background: "#0f0f0f", borderRadius: T.r, border: "1px solid #2a2a2a", fontSize: 11, color: "#aaa", fontFamily: "monospace" }}>
            ✓ {repoInfo.owner}/{repoInfo.repo} · {branches.length} branch{branches.length !== 1 ? "es" : ""}
          </div>
        )}

        {/* Branch selector */}
        {branches.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <FieldLabel>branch</FieldLabel>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", background: T.overlay, border: "1px solid #333", borderRadius: T.r, color: "#fff", fontFamily: "monospace", fontSize: 13, outline: "none" }}
            >
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}

        {/* Error banner */}
        <ErrorBanner error={error} onRetry={branches.length || error ? handleRetry : null} />

        {/* Progress banner */}
        <ProgressBanner progress={progress} cloning={cloning} />

        {/* Clone button */}
        {branches.length > 0 && (
          <button
            onClick={handleClone}
            disabled={cloning || !selectedBranch}
            style={{
              width: "100%", padding: "11px",
              background: cloning ? "#333" : T.brand,
              border: "none", borderRadius: T.rMd,
              color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: cloning ? "not-allowed" : "pointer",
              fontFamily: "monospace",
            }}
          >
            {cloning ? "cloning…" : `clone ${selectedBranch}`}
          </button>
        )}
      </div>
    </div>
  )
}
