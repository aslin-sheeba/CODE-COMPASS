import React from "react"
import { importProject, onScanProgress } from "./services/projectService"
import { useProjectStore } from "./state/projectStore"
import { T } from "./theme"
import { pillStyle, basename } from "./utils"

import FileExplorer      from "./components/Dashboard/FileExplorer"
import CodePreview       from "./components/Dashboard/CodePreview"
import StatsCards        from "./components/StatsCards"
import LanguageChart     from "./components/Dashboard/LanguageChart"
import InsightsPanel     from "./components/InsightsPanel"
import UnusedFilesPanel  from "./components/UnusedFilesPanel"
import CodeSearch        from "./pages/CodeSearch"
import DependencyLens    from "./pages/DependencyLens"
import Architecture      from "./pages/Architecture"
import GitHubImportModal from "./components/GitHubImportModel"
import GitActivity       from "./pages/GitActivity"
import AIAssistant       from "./pages/AIAssistant"
import Onboarding        from "./pages/Onboarding"
import ErrorBoundary     from "./components/ErrorBoundary"

import FileMetricsPanel   from "./components/Dashboard/FileMetricsPanel"

import { buildIndex }      from "./services/searchService"
import { findUnusedFiles } from "./services/unusedService"

// ── Static styles ─────────────────────────────────────────────────────────────
const S = {
  root: {
    height: "100vh", display: "flex", flexDirection: "column",
    fontFamily: "'JetBrains Mono','Fira Code','SF Mono',monospace", fontSize: 12,
  },
  topBar: {
    height: 46, borderBottom: `1px solid ${T.border}`,
    display: "flex", alignItems: "center",
    padding: "0 20px", gap: 16, flexShrink: 0,
    justifyContent: "space-between", background: T.surface,
  },
  logoText: {
    fontSize: 15, fontWeight: 700, color: T.brand,
    fontFamily: "monospace", letterSpacing: "-0.5px",
  },
  tabBar: {
    display: "flex", alignItems: "flex-end",
    borderBottom: `1px solid ${T.border}`,
    background: T.surface, flexShrink: 0,
    paddingLeft: 12, gap: 0, overflowX: "auto",
  },
  bodyWrap:   { flex: 1, display: "flex", overflow: "hidden", background: T.bg },
  leftPane:   { width: 220, flexShrink: 0, borderRight: `1px solid ${T.border}`, background: T.surface, display: "flex", flexDirection: "column", overflow: "hidden" },
  centerPane: { flex: 1, overflow: "auto", display: "flex", flexDirection: "column" },
  btnBase: {
    padding: "5px 14px", borderRadius: T.r,
    fontSize: 12, fontFamily: "monospace", cursor: "pointer",
  },
}

// ── Scan progress bar ─────────────────────────────────────────────────────────
function ScanProgressBar({ scanning, processed, total }) {
  if (!scanning) return null
  const pct = total ? Math.round((processed / total) * 100) : null

  return (
    <div style={{
      height: 3, background: T.surfaceAlt, flexShrink: 0, overflow: "hidden",
    }}>
      <div style={{
        height: "100%", background: T.brand,
        width: pct != null ? `${pct}%` : "40%",
        transition: pct != null ? "width 0.3s ease" : "none",
        animation: pct == null ? "scanPulse 1.4s ease-in-out infinite" : "none",
      }} />
      <style>{`
        @keyframes scanPulse {
          0%   { transform: translateX(-100%); width: 40%; }
          100% { transform: translateX(350%);  width: 40%; }
        }
      `}</style>
    </div>
  )
}

// ── Pill ──────────────────────────────────────────────────────────────────────
const Pill = React.memo(function Pill({ children, color = T.teal, bg = T.tealLight, border = T.tealBorder }) {
  return <span style={pillStyle({ color, bg, border })}>{children}</span>
})

// ── TopBar ────────────────────────────────────────────────────────────────────
const TopBar = React.memo(function TopBar({ files, scanning, processed, onImport, setShowGitHub, cloneStatus }) {
  return (
    <div style={S.topBar}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={S.logoText}>compass</span>
        {files.length > 0 && <Pill>{files.length} files</Pill>}
        {scanning && (
          <Pill color={T.brand} bg={T.brandLight} border={T.brandBorder}>
            scanning… {processed > 0 ? `${processed}` : ""}
          </Pill>
        )}
        {cloneStatus && cloneStatus.phase !== "done" && (
          <Pill color={T.orange} bg={T.orangeLight} border={T.orangeBorder}>
            ⏳ {cloneStatus.message}
          </Pill>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={onImport} disabled={scanning} style={{
          ...S.btnBase,
          border: `1px solid ${T.border}`,
          background: scanning ? T.surfaceAlt : T.surface,
          color: scanning ? T.textHint : T.textSub,
          cursor: scanning ? "not-allowed" : "pointer",
        }}>
          {scanning ? `scanning (${processed})…` : "import project"}
        </button>
        <button onClick={() => setShowGitHub(true)} disabled={scanning} style={{
          ...S.btnBase,
          border: `1px solid ${T.brandBorder}`,
          background: T.brandLight, color: T.brand, fontWeight: 500,
        }}>
          clone github
        </button>
      </div>
    </div>
  )
})

// ── TabBar ────────────────────────────────────────────────────────────────────
const TABS_MAP = [
  { id: "dashboard",    labelFn: (sf) => sf ? basename(sf.path) : "dashboard" },
  { id: "architecture", labelFn: () => "architecture" },
  { id: "search",       labelFn: () => "search" },
  { id: "lens",         labelFn: () => "dependency lens" },
  { id: "git",          labelFn: () => "git activity" },
  { id: "ai",           labelFn: () => "ai assistant" },
  { id: "onboarding",   labelFn: () => "onboarding" },
]

const TabBar = React.memo(function TabBar({ tab, setTab, selectedFile }) {
  return (
    <div style={S.tabBar}>
      {TABS_MAP.map(t => {
        const active = tab === t.id
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "9px 16px", fontFamily: "monospace", fontSize: 12,
            border: "none", background: "none",
            borderBottom: active ? `2px solid ${T.brand}` : "2px solid transparent",
            color: active ? T.brand : T.textSub,
            cursor: "pointer", fontWeight: active ? 600 : 400,
            transition: "all 0.12s", whiteSpace: "nowrap",
          }}>
            {t.labelFn(selectedFile)}
          </button>
        )
      })}
    </div>
  )
})

// ── Welcome ───────────────────────────────────────────────────────────────────
const Welcome = React.memo(function Welcome({ onImport, onGitHub }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, background: T.bg }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: T.brandLight, border: `1px solid ${T.brandBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🧭</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>Welcome to CodeCompass</div>
        <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.7 }}>Import a local project or clone from GitHub to get started.</div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onImport} style={{ padding: "9px 22px", borderRadius: T.rMd, border: `1px solid ${T.brandBorder}`, background: T.brandLight, color: T.brand, fontSize: 13, cursor: "pointer", fontFamily: "monospace", fontWeight: 600 }}>import project</button>
        <button onClick={onGitHub} style={{ padding: "9px 22px", borderRadius: T.rMd, border: `1px solid ${T.border}`, background: T.surface, color: T.textSub, fontSize: 13, cursor: "pointer", fontFamily: "monospace" }}>clone github</button>
      </div>
    </div>
  )
})

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const { files, setFiles, selectFile, selectedFile } = useProjectStore()

  const [tab,         setTab]         = React.useState("dashboard")
  const [unusedFiles, setUnusedFiles] = React.useState([])
  const [scanning,    setScanning]    = React.useState(false)
  const [processed,   setProcessed]   = React.useState(0)
  const [total,       setTotal]       = React.useState(0)
  const [showGitHub,  setShowGitHub]  = React.useState(false)
  const [cloneStatus, setCloneStatus] = React.useState(null)

  React.useEffect(() => {
    onScanProgress((p) => {
      setScanning(true)
      setProcessed(p.processed || 0)
      if (p.total) setTotal(p.total)
    })
    return () => {}
  }, [])

  React.useEffect(() => {
    if (!window.electronAPI?.onCloneProgress) return
    window.electronAPI.onCloneProgress((data) => setCloneStatus(data))
  }, [])

  const handleImport = React.useCallback(async () => {
    setScanning(true)
    setProcessed(0)
    setTotal(0)
    const result = await importProject()
    if (result) {
      setFiles(result)
      buildIndex(result)
      setUnusedFiles(findUnusedFiles(result))
      setTab("dashboard")
    }
    setScanning(false)
  }, [setFiles])

  const handleGitHubImport = React.useCallback((result) => {
    if (result) {
      setFiles(result)
      buildIndex(result)
      setUnusedFiles(findUnusedFiles(result))
      setTab("dashboard")
    }
    setShowGitHub(false)
    setCloneStatus(null)
  }, [setFiles])

  return (
    <div style={{ ...S.root, background: T.bg, color: T.text }}>
      <TopBar
        files={files} scanning={scanning} processed={processed}
        onImport={handleImport} setShowGitHub={setShowGitHub}
        cloneStatus={cloneStatus}
      />

      {/* Scan progress bar — shown during scanning */}
      <ScanProgressBar scanning={scanning} processed={processed} total={total} />

      {files.length === 0 ? (
        <Welcome onImport={handleImport} onGitHub={() => setShowGitHub(true)} />
      ) : (
        <>
          <TabBar tab={tab} setTab={setTab} selectedFile={selectedFile} />

          {/* Dashboard stats strip */}
          {tab === "dashboard" && (
            <div style={{
              padding: "10px 16px", borderBottom: `1px solid ${T.border}`,
              background: T.surface, flexShrink: 0,
            }}>
              <StatsCards />
            </div>
          )}

          <div style={S.bodyWrap}>
            <div style={S.leftPane}><FileExplorer /></div>
            <div style={S.centerPane}>
              <ErrorBoundary>
                {tab === "dashboard"    && <CodePreview unusedFiles={unusedFiles} />}
                {tab === "architecture" && <Architecture />}
                {tab === "search"       && <div style={{ padding: 20, flex: 1 }}><CodeSearch /></div>}
                {tab === "lens"         && <DependencyLens />}
                {tab === "git"          && <GitActivity />}
                {tab === "ai"           && <AIAssistant />}
                {tab === "onboarding"   && <Onboarding />}
              </ErrorBoundary>
            </div>
            {tab === "dashboard" && (
              <FileMetricsPanel unusedFiles={unusedFiles} onSelectUnused={selectFile} />
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