import React from "react"
import { importProject, onScanProgress } from "./services/projectService"
import { useProjectStore } from "./state/projectStore"
import { T } from "./theme"

import FileExplorer from "./components/Dashboard/FileExplorer"
import CodePreview from "./components/Dashboard/CodePreview"
import CodeSearch from "./pages/CodeSearch"
import DependencyLens from "./pages/DependencyLens"
import Architecture from "./pages/Architecture"
import GitHubImportModal from "./components/GitHubImportModel"
import GitActivity from "./pages/GitActivity"
import AIAssistant from "./pages/AIAssistant"
import Onboarding from "./pages/Onboarding"

import { buildIndex } from "./services/searchService"
import { findUnusedFiles } from "./services/unusedService"

const TABS = [
  { id: "dashboard",   label: "App.jsx" },
  { id: "architecture",label: "architecture" },
  { id: "search",      label: "search" },
  { id: "lens",        label: "lens" },
  { id: "git",         label: "git" },
  { id: "ai",          label: "ai" },
  { id: "onboarding",  label: "onboarding" },
]

// ── Pill badge ──────────────────────────────────────────────────────────────
function Pill({ children, color = T.teal, bg = T.tealLight, border = T.tealBorder, style = {} }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontFamily: "monospace", fontWeight: 500,
      color, background: bg, border: `1px solid ${border}`,
      ...style
    }}>
      {children}
    </span>
  )
}

// ── Top compass logo bar ────────────────────────────────────────────────────
function TopBar({ files, scanning, processed, onImport, onGitHub, setShowGitHub, cloneStatus }) {
  return (
    <div style={{
      height: 46, background: T.surface,
      borderBottom: `1px solid ${T.border}`,
      display: "flex", alignItems: "center",
      padding: "0 20px", gap: 16, flexShrink: 0,
      justifyContent: "space-between"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{
          fontSize: 15, fontWeight: 700, color: T.brand,
          fontFamily: "monospace", letterSpacing: "-0.5px"
        }}>
          compass
        </span>
        {files.length > 0 && (
          <Pill>{files.length} files</Pill>
        )}
        {cloneStatus && cloneStatus.phase !== "done" && (
          <Pill color={T.orange} bg={T.orangeLight} border={T.orangeBorder}>
            ⏳ {cloneStatus.message}
          </Pill>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={onImport}
          disabled={scanning}
          style={{
            padding: "5px 14px", borderRadius: T.r,
            border: `1px solid ${T.border}`,
            background: scanning ? T.surfaceAlt : T.surface,
            color: scanning ? T.textHint : T.textSub,
            fontSize: 12, cursor: scanning ? "not-allowed" : "pointer",
            fontFamily: "monospace",
          }}
        >
          {scanning ? `scanning (${processed})…` : "import project"}
        </button>
        <button
          onClick={() => setShowGitHub(true)}
          disabled={scanning}
          style={{
            padding: "5px 14px", borderRadius: T.r,
            border: `1px solid ${T.brandBorder}`,
            background: T.brandLight, color: T.brand,
            fontSize: 12, cursor: "pointer",
            fontFamily: "monospace", fontWeight: 500,
          }}
        >
          clone github
        </button>
      </div>
    </div>
  )
}

// ── Tab bar (looks like open file tabs) ────────────────────────────────────
function TabBar({ tab, setTab, files, selectedFile }) {
  const tabLabel = selectedFile
    ? (selectedFile.path || "").replace(/\\/g, "/").split("/").pop()
    : "App.jsx"

  const TABS_MAP = [
    { id: "dashboard",    label: tabLabel },
    { id: "architecture", label: "architecture" },
    { id: "search",       label: "search" },
    { id: "lens",         label: "dependency lens" },
    { id: "git",          label: "git activity" },
    { id: "ai",           label: "ai assistant" },
    { id: "onboarding",   label: "onboarding" },
  ]

  return (
    <div style={{
      display: "flex", alignItems: "flex-end",
      borderBottom: `1px solid ${T.border}`,
      background: T.surface, flexShrink: 0,
      paddingLeft: 12, gap: 0, overflowX: "auto"
    }}>
      {TABS_MAP.map(t => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          style={{
            padding: "9px 16px",
            fontFamily: "monospace", fontSize: 12,
            border: "none", background: "none",
            borderBottom: tab === t.id ? `2px solid ${T.brand}` : "2px solid transparent",
            color: tab === t.id ? T.brand : T.textSub,
            cursor: "pointer", fontWeight: tab === t.id ? 600 : 400,
            transition: "all 0.12s", whiteSpace: "nowrap",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Empty welcome state ─────────────────────────────────────────────────────
function Welcome({ onImport, onGitHub }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 20, background: T.bg
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: T.brandLight, border: `1px solid ${T.brandBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28
      }}>🧭</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>
          Welcome to CodeCompass
        </div>
        <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.7 }}>
          Import a local project or clone from GitHub to get started.
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onImport} style={{
          padding: "9px 22px", borderRadius: T.rMd,
          border: `1px solid ${T.brandBorder}`,
          background: T.brandLight, color: T.brand,
          fontSize: 13, cursor: "pointer",
          fontFamily: "monospace", fontWeight: 600,
        }}>
          import project
        </button>
        <button onClick={onGitHub} style={{
          padding: "9px 22px", borderRadius: T.rMd,
          border: `1px solid ${T.border}`,
          background: T.surface, color: T.textSub,
          fontSize: 13, cursor: "pointer",
          fontFamily: "monospace",
        }}>
          clone github
        </button>
      </div>
    </div>
  )
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const { files, setFiles, selectFile, selectedFile } = useProjectStore()

  const [tab,        setTab]        = React.useState("dashboard")
  const [unusedFiles,setUnusedFiles]= React.useState([])
  const [scanning,   setScanning]   = React.useState(false)
  const [processed,  setProcessed]  = React.useState(0)
  const [showGitHub, setShowGitHub] = React.useState(false)
  const [cloneStatus,setCloneStatus]= React.useState(null)

  React.useEffect(() => {
    onScanProgress((p) => { setScanning(true); setProcessed(p.processed || 0) })
  }, [])

  React.useEffect(() => {
    if (window.electronAPI?.onCloneProgress) {
      window.electronAPI.onCloneProgress((data) => setCloneStatus(data))
    }
  }, [])

  const handleImport = async () => {
    setScanning(true)
    const result = await importProject()
    if (result) {
      setFiles(result)
      buildIndex(result)
      setUnusedFiles(findUnusedFiles(result))
      setTab("dashboard")
    }
    setScanning(false)
  }

  const handleGitHubImport = (result) => {
    if (result) {
      setFiles(result)
      buildIndex(result)
      setUnusedFiles(findUnusedFiles(result))
      setTab("dashboard")
    }
    setShowGitHub(false)
    setCloneStatus(null)
  }

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: T.bg, color: T.text,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      fontSize: 12,
    }}>
      <TopBar
        files={files} scanning={scanning} processed={processed}
        onImport={handleImport} setShowGitHub={setShowGitHub}
        cloneStatus={cloneStatus}
      />

      {files.length === 0 ? (
        <Welcome onImport={handleImport} onGitHub={() => setShowGitHub(true)} />
      ) : (
        <>
          <TabBar tab={tab} setTab={setTab} files={files} selectedFile={selectedFile} />

          <div style={{ flex: 1, display: "flex", overflow: "hidden", background: T.bg }}>

            {/* LEFT: Explorer (always visible) */}
            <div style={{
              width: 220, flexShrink: 0,
              borderRight: `1px solid ${T.border}`,
              background: T.surface,
              display: "flex", flexDirection: "column",
              overflow: "hidden"
            }}>
              <FileExplorer />
            </div>

            {/* CENTER: Page content */}
            <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
              {tab === "dashboard"    && <CodePreview unusedFiles={unusedFiles} />}
              {tab === "architecture" && <Architecture />}
              {tab === "search"       && <div style={{ padding: 20, flex: 1 }}><CodeSearch /></div>}
              {tab === "lens"         && <DependencyLens />}
              {tab === "git"          && <GitActivity />}
              {tab === "ai"           && <AIAssistant />}
              {tab === "onboarding"   && <Onboarding />}
            </div>

            {/* RIGHT: File Metrics panel — ONLY on dashboard */}
            {tab === "dashboard" && (
              <FileMetricsPanel unusedFiles={unusedFiles} onSelectUnused={(f) => selectFile(f)} />
            )}
          </div>
        </>
      )}

      {showGitHub && (
        <GitHubImportModal
          onClose={() => setShowGitHub(false)}
          onImport={handleGitHubImport}
        />
      )}
    </div>
  )
}

// ── File Metrics Panel (right sidebar, dashboard only) ──────────────────────
function FileMetricsPanel({ unusedFiles, onSelectUnused }) {
  const { selectedFile, files } = useProjectStore()

  if (!selectedFile) {
    return (
      <div style={{
        width: 220, flexShrink: 0,
        borderLeft: `1px solid ${T.border}`,
        background: T.surface,
        display: "flex", flexDirection: "column",
        overflow: "hidden"
      }}>
        <div style={{
          padding: "10px 14px", borderBottom: `1px solid ${T.border}`,
          fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
          color: T.textHint, fontWeight: 600
        }}>
          file metrics
        </div>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          color: T.textHint, fontSize: 11, textAlign: "center", padding: 20
        }}>
          select a file to see metrics
        </div>
      </div>
    )
  }

  const meta    = selectedFile._meta || {}
  const imports = selectedFile.imports || []
  const usedBy  = files.filter(f =>
    (f.imports || []).some(imp => imp.includes(
      (selectedFile.path || "").replace(/\\/g, "/").split("/").pop().replace(/\.[^.]+$/, "")
    ))
  )

  const fanOut    = imports.filter(i => !i.startsWith(".") && !i.startsWith("/")).length || 0
  const fanIn     = meta.incoming || 0
  const risk      = meta.stressScore || 0
  const riskMax   = 10
  const riskDisp  = Math.min(Math.round(risk / 4), riskMax)
  const depth     = Math.min(imports.length, 8)
  const lines     = selectedFile.lines || 0

  const localImports = imports.filter(i => i.startsWith(".") || i.startsWith("/")).slice(0, 5)
  const usedByList   = usedBy.slice(0, 3)

  function MetricRow({ label, value, valueColor }) {
    return (
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", padding: "5px 0",
        borderBottom: `1px solid ${T.border}`
      }}>
        <span style={{ fontSize: 11, color: T.textSub }}>{label}</span>
        <span style={{
          fontSize: 11, fontWeight: 600, fontFamily: "monospace",
          color: valueColor || T.text
        }}>{value}</span>
      </div>
    )
  }

  function DotList({ items, color }) {
    if (!items.length) return (
      <div style={{ fontSize: 10, color: T.textHint, padding: "4px 0" }}>none</div>
    )
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((item, i) => {
          const name = typeof item === "string"
            ? item.replace(/\\/g, "/").split("/").pop()
            : (item.path || "").replace(/\\/g, "/").split("/").pop()
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: color, flexShrink: 0 }} />
              <span style={{
                fontSize: 10, color: T.textSub, fontFamily: "monospace",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}>{name}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{
      width: 220, flexShrink: 0,
      borderLeft: `1px solid ${T.border}`,
      background: T.surface,
      display: "flex", flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px", borderBottom: `1px solid ${T.border}`,
        fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
        color: T.textHint, fontWeight: 600
      }}>
        file metrics
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
        {/* Metric rows */}
        <MetricRow label="Fan-out"    value={fanOut}  valueColor={fanOut > 8  ? T.red   : T.text} />
        <MetricRow label="Fan-in"     value={fanIn}   valueColor={fanIn  > 10 ? T.red   : T.text} />
        <MetricRow label="Risk score" value={`${riskDisp} / ${riskMax}`} valueColor={riskDisp > 7 ? T.red : riskDisp > 4 ? T.orange : T.text} />
        <MetricRow label="Depth"      value={depth}   valueColor={depth  > 5  ? T.orange : T.text} />
        <MetricRow label="Lines"      value={lines} />
        <MetricRow label="Last changed" value="—" />

        {/* Imports */}
        <div style={{ marginTop: 14, marginBottom: 6 }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, fontWeight: 600, marginBottom: 8 }}>
            imports
          </div>
          <DotList items={localImports} color={T.orange} />
          {imports.length > 5 && (
            <div style={{ fontSize: 10, color: T.textHint, marginTop: 4 }}>
              +{imports.length - 5} more
            </div>
          )}
        </div>

        {/* Used by */}
        <div style={{ marginTop: 14, marginBottom: 6 }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, fontWeight: 600, marginBottom: 8 }}>
            used by
          </div>
          <DotList items={usedByList} color={T.teal} />
        </div>

        {/* Unused files */}
        {unusedFiles && unusedFiles.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, fontWeight: 600, marginBottom: 8 }}>
              unused files
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {unusedFiles.slice(0, 8).map((f, i) => {
                const name = (f.path || "").replace(/\\/g, "/").split("/").pop()
                return (
                  <span
                    key={i}
                    onClick={() => onSelectUnused && onSelectUnused(f)}
                    style={{
                      padding: "2px 8px", borderRadius: 4,
                      background: T.pinkLight, border: `1px solid ${T.pinkBorder}`,
                      color: T.pink, fontSize: 10, cursor: "pointer",
                      fontFamily: "monospace",
                    }}
                  >
                    {name}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}