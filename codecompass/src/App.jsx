import React from "react"
import { importProject, onScanProgress } from "./services/projectService"
import { useProjectStore } from "./state/projectStore"
import { buildIndex } from "./services/searchService"
import { findUnusedFiles } from "./services/unusedService"
import { calculateMetrics } from "./services/riskService"

import StatsBar      from "./components/Dashboard/StatsBar"
import FileExplorer  from "./components/Dashboard/FileExplorer"
import CodePreview   from "./components/Dashboard/CodePreview"
import ModuleGraph   from "./components/ModuleGraph"
import InsightsPanel from "./components/InsightsPanel"
import UnusedFilesPanel from "./components/UnusedFilesPanel"
import CodeSearch    from "./pages/CodeSearch"
import DependencyLens from "./pages/DependencyLens"
import AIAssistant   from "./pages/AIAssistant"
import GitActivity   from "./pages/GitActivity"
import Onboarding    from "./pages/Onboarding"
import Architecture from "./pages/Architecture"

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard",    label: "Dashboard",       icon: "📊" },
  { id: "architecture", label: "Architecture",    icon: "🏗" },
  { id: "search",       label: "Code Search",     icon: "🔍" },
  { id: "lens",         label: "Dependency Lens", icon: "🔗" },
  { id: "ai",           label: "AI Assistant",    icon: "🤖" },
  { id: "git",          label: "Git Activity",    icon: "📈" },
  { id: "onboarding",   label: "Onboarding",      icon: "✅" },
]

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ onImport, scanning }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100%", gap: 16, color: "#4a5570"
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        border: "1px dashed #1e2535",
        display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 28
      }}>
        📁
      </div>
      <div style={{
        fontSize: 16, fontWeight: 700, color: "#e8edf5"
      }}>
        No project loaded
      </div>
      <div style={{
        fontSize: 12, color: "#4a5570",
        fontFamily: "monospace", textAlign: "center",
        maxWidth: 300
      }}>
        Import a project folder to begin structural analysis,
        dependency mapping and code exploration
      </div>
      <button
        onClick={onImport}
        disabled={scanning}
        style={{
          background: "#00e5ff", color: "#0a0c0f",
          border: "none", padding: "9px 24px",
          borderRadius: 6, fontWeight: 700,
          cursor: scanning ? "not-allowed" : "pointer",
          fontSize: 13, opacity: scanning ? 0.6 : 1
        }}
      >
        {scanning ? "Scanning..." : "Import Project"}
      </button>
    </div>
  )
}

// ─── SCAN PROGRESS BAR ───────────────────────────────────────────────────────
function ScanProgress({ processed }) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "#0e1117", borderTop: "1px solid #1e2535",
      padding: "10px 20px", display: "flex",
      alignItems: "center", gap: 12, zIndex: 50
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: "#00e5ff",
        boxShadow: "0 0 8px #00e5ff",
        animation: "pulse 1s infinite"
      }} />
      <div style={{
        fontSize: 11, fontFamily: "monospace", color: "#00e5ff"
      }}>
        Scanning project...
      </div>
      <div style={{
        flex: 1, height: 3, background: "#1e2535",
        borderRadius: 2, overflow: "hidden"
      }}>
        <div style={{
          height: "100%", background: "#00e5ff",
          borderRadius: 2,
          width: `${Math.min((processed / 200) * 100, 95)}%`,
          transition: "width 0.3s ease",
          boxShadow: "0 0 6px #00e5ff"
        }} />
      </div>
      <div style={{
        fontSize: 11, fontFamily: "monospace",
        color: "#4a5570", flexShrink: 0
      }}>
        {processed} files
      </div>
    </div>
  )
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
function Topbar({ scanning, processed, onImport, fileCount }) {
  return (
    <div style={{
      height: 44, background: "#0e1117",
      borderBottom: "1px solid #1e2535",
      display: "flex", alignItems: "center",
      padding: "0 20px", gap: 16, flexShrink: 0
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: "monospace", fontWeight: 800,
        fontSize: 13, color: "#00e5ff",
        letterSpacing: "0.15em"
      }}>
        CODE<span style={{ color: "#9c6fff" }}>COMPASS</span>
      </div>

      <div style={{
        width: 1, height: 16, background: "#1e2535"
      }} />

      {/* File count badge */}
      <div style={{
        fontSize: 10, fontFamily: "monospace",
        color: fileCount > 0 ? "#00e5ff" : "#4a5570",
        display: "flex", alignItems: "center", gap: 6
      }}>
        <div style={{
          width: 5, height: 5, borderRadius: "50%",
          background: fileCount > 0 ? "#00e676" : "#1e2535",
          boxShadow: fileCount > 0 ? "0 0 5px #00e676" : "none"
        }} />
        {fileCount > 0
          ? `${fileCount} files indexed`
          : "no project loaded"
        }
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Import button */}
      <button
        onClick={onImport}
        disabled={scanning}
        style={{
          background: scanning ? "#1e2535" : "#00e5ff",
          color: scanning ? "#4a5570" : "#0a0c0f",
          border: "none", padding: "6px 18px",
          borderRadius: 6, fontWeight: 700,
          cursor: scanning ? "not-allowed" : "pointer",
          fontSize: 12, transition: "all 0.15s"
        }}
      >
        {scanning ? `Scanning (${processed})` : "Import Project"}
      </button>
    </div>
  )
}

// ─── TAB BAR ─────────────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 2,
      padding: "6px 16px",
      borderBottom: "1px solid #1e2535",
      background: "#0e1117",
      flexShrink: 0, overflowX: "auto"
    }}>
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: "5px 14px",
            borderRadius: 6, border: "none",
            background: active === t.id ? "#00e5ff12" : "transparent",
            color: active === t.id ? "#00e5ff" : "#6b7a99",
            fontWeight: active === t.id ? 700 : 400,
            cursor: "pointer", fontSize: 12,
            whiteSpace: "nowrap",
            transition: "all 0.15s",
            borderBottom: active === t.id
              ? "2px solid #00e5ff"
              : "2px solid transparent",
            display: "flex", alignItems: "center", gap: 6
          }}
        >
          <span style={{ fontSize: 13 }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── DASHBOARD LAYOUT ────────────────────────────────────────────────────────
function DashboardLayout({ files, unusedFiles }) {
  const { selectFile } = useProjectStore()

  if (files.length === 0) return null

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", overflow: "hidden"
    }}>
      {/* Stats bar */}
      <div style={{ flexShrink: 0, padding: "14px 14px 10px" }}>
        <StatsBar />
      </div>

      {/* Explorer + Preview */}
      <div style={{
        flex: 1, display: "flex",
        gap: 10, padding: "0 14px 14px",
        overflow: "hidden", minHeight: 0
      }}>
        <FileExplorer />
        <CodePreview />

        {/* Right panel */}
        <div style={{
          width: 240, flexShrink: 0,
          display: "flex", flexDirection: "column",
          gap: 10, overflow: "auto"
        }}>
          <InsightsPanel />
          {unusedFiles.length > 0 && (
            <UnusedFilesPanel
              files={unusedFiles}
              onSelect={selectFile}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const { files, setFiles, selectFile } = useProjectStore()

  const [tab,          setTab]          = React.useState("dashboard")
  const [unusedFiles,  setUnusedFiles]  = React.useState([])
  const [scanning,     setScanning]     = React.useState(false)
  const [processed,    setProcessed]    = React.useState(0)

  React.useEffect(() => {
    onScanProgress((p) => {
      setScanning(true)
      setProcessed(p.processed || 0)
    })
  }, [])

  const handleImport = async () => {
    setScanning(true)
    setProcessed(0)

    try {
      const result = await importProject()
      if (result) {
        const withMetrics = calculateMetrics(result)
        setFiles(withMetrics)
        buildIndex(withMetrics)
        setUnusedFiles(findUnusedFiles(withMetrics))
        setTab("dashboard")
      }
    } finally {
      setScanning(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.4 }
        }
        * { box-sizing: border-box; }
        body {
          margin: 0; padding: 0;
          background: #0a0c0f;
          color: #e8edf5;
          font-family: sans-serif;
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: #1e2535; border-radius: 2px;
        }
      `}</style>

      <div style={{
        height: "100vh", display: "flex",
        flexDirection: "column", overflow: "hidden",
        background: "#0a0c0f"
      }}>

        {/* TOPBAR */}
        <Topbar
          scanning={scanning}
          processed={processed}
          onImport={handleImport}
          fileCount={files.length}
        />

        {/* TAB BAR */}
        <TabBar active={tab} onChange={setTab} />

        {/* PAGE CONTENT */}
        <div style={{
          flex: 1, overflow: "hidden",
          display: "flex", flexDirection: "column"
        }}>

          {tab === "dashboard" && (
            files.length === 0
              ? <EmptyState
                  onImport={handleImport}
                  scanning={scanning}
                />
              : <DashboardLayout
                  files={files}
                  unusedFiles={unusedFiles}
                />
          )}

         {tab === "architecture" && (
  files.length === 0
    ? <EmptyState onImport={handleImport} scanning={scanning} />
    : <div style={{
        flex: 1, overflow: "hidden",
        display: "flex", flexDirection: "column"
      }}>
        <Architecture />
      </div>
)}

          {tab === "search"      && <div style={{ flex: 1, overflow: "auto" }}><CodeSearch /></div>}
          {tab === "lens"        && <div style={{ flex: 1, overflow: "auto" }}><DependencyLens /></div>}
          {tab === "ai"          && <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}><AIAssistant /></div>}
          {tab === "git"         && <div style={{ flex: 1, overflow: "auto" }}><GitActivity /></div>}
          {tab === "onboarding"  && <div style={{ flex: 1, overflow: "auto" }}><Onboarding /></div>}

        </div>

        {/* SCAN PROGRESS */}
        {scanning && <ScanProgress processed={processed} />}

      </div>
    </>
  )
}

