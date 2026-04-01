import React from "react"
import { T } from "../theme"

export default function GitHubImportModal({ onClose, onImport }) {
  const [repoUrl,         setRepoUrl]         = React.useState("")
  const [token,           setToken]           = React.useState("")
  const [showToken,       setShowToken]       = React.useState(false)
  const [branches,        setBranches]        = React.useState([])
  const [selectedBranch,  setSelectedBranch]  = React.useState("")
  const [fetchingBranches,setFetchingBranches]= React.useState(false)
  const [cloning,         setCloning]         = React.useState(false)
  const [progress,        setProgress]        = React.useState(null)
  const [error,           setError]           = React.useState("")
  const [repoInfo,        setRepoInfo]        = React.useState(null)

  React.useEffect(() => {
    if (window.electronAPI?.onCloneProgress) {
      window.electronAPI.onCloneProgress((data) => setProgress(data))
    }
  }, [])

  const handleFetchBranches = async () => {
    if (!repoUrl.trim()) return
    setError(""); setFetchingBranches(true); setBranches([]); setSelectedBranch(""); setRepoInfo(null)
    const result = await window.electronAPI.getGitHubBranches({ repoUrl: repoUrl.trim(), token: token.trim() || null })
    setFetchingBranches(false)
    if (result.error) { setError(result.error); return }
    setBranches(result.branches)
    setSelectedBranch(result.branches[0] || "")
    setRepoInfo({ owner: result.owner, repo: result.repo })
  }

  const handleClone = async () => {
    if (!selectedBranch) return
    setError(""); setCloning(true); setProgress({ message: "Starting clone…", phase: "cloning" })
    const result = await window.electronAPI.cloneFromGitHub({ repoUrl: repoUrl.trim(), branch: selectedBranch, token: token.trim() || null })
    setCloning(false)
    if (result.error) { setError(result.error); setProgress(null); return }
    onImport(result.files)
  }

  function Inp({ label, value, onChange, placeholder, type = "text", action }) {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: T.textHint, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
          {label}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
              flex: 1, padding: "10px 14px",
              background: T.overlay, border: `1px solid #333`,
              borderRadius: T.r, color: "#fff",
              fontFamily: "monospace", fontSize: 13, outline: "none",
            }}
          />
          {action && (
            <button onClick={action.fn} style={{
              padding: "10px 16px", borderRadius: T.r,
              background: T.brand, color: "#fff", border: "none",
              fontSize: 12, cursor: "pointer", fontFamily: "monospace", fontWeight: 600,
              opacity: fetchingBranches ? 0.6 : 1
            }}>
              {fetchingBranches ? "…" : action.label}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#1a1a1a", borderRadius: T.rLg,
        width: 440, padding: 28,
        border: "1px solid #2a2a2a",
        position: "relative"
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 14,
          background: "none", border: "none", color: "#666",
          fontSize: 16, cursor: "pointer"
        }}>✕</button>

        {/* Repo input */}
        <Inp
          label="repository"
          value={repoUrl}
          onChange={setRepoUrl}
          placeholder="facebook/react"
          action={{ label: "fetch", fn: handleFetchBranches }}
        />

        {/* Token */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: T.textHint, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
            personal access token (optional)
          </div>
          <div style={{ position: "relative" }}>
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxx"
              style={{
                width: "100%", padding: "10px 44px 10px 14px",
                background: T.overlay, border: "1px solid #333",
                borderRadius: T.r, color: "#fff",
                fontFamily: "monospace", fontSize: 13, outline: "none",
                boxSizing: "border-box"
              }}
            />
            <button onClick={() => setShowToken(s => !s)} style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 13
            }}>
              {showToken ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {/* Branch selector */}
        {branches.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: T.textHint, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
              branch
            </div>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              style={{
                width: "100%", padding: "10px 14px",
                background: T.overlay, border: "1px solid #333",
                borderRadius: T.r, color: "#fff",
                fontFamily: "monospace", fontSize: 13, outline: "none",
              }}
            >
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}

        {/* Repo info */}
        {repoInfo && (
          <div style={{
            marginBottom: 14, padding: "8px 12px",
            background: "#0f0f0f", borderRadius: T.r,
            border: "1px solid #2a2a2a",
            fontSize: 11, color: "#aaa", fontFamily: "monospace"
          }}>
            {repoInfo.owner}/{repoInfo.repo} · {branches.length} branches
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: 14, padding: "8px 12px",
            background: T.redLight, border: `1px solid ${T.redBorder}`,
            borderRadius: T.r, fontSize: 12, color: T.red
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Progress */}
        {progress && cloning && (
          <div style={{
            marginBottom: 14, padding: "8px 12px",
            background: T.tealLight, border: `1px solid ${T.tealBorder}`,
            borderRadius: T.r, fontSize: 12, color: T.teal, fontFamily: "monospace"
          }}>
            ⏳ {progress.message}
          </div>
        )}

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
              fontFamily: "monospace"
            }}
          >
            {cloning ? "cloning…" : `clone ${selectedBranch}`}
          </button>
        )}
      </div>
    </div>
  )
}