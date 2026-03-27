import React from "react"
import { importProject, onScanProgress } from "./services/projectService"
import { useProjectStore } from "./state/projectStore"

// Components
import StatsBar from "./components/Dashboard/StatsBar"
import FileExplorer from "./components/Dashboard/FileExplorer"
import CodePreview from "./components/Dashboard/CodePreview"
import LanguageChart from "./components/Dashboard/LanguageChart"
import CodeSearch from "./pages/CodeSearch"
import ModuleGraph from "./components/ModuleGraph"
import InsightsPanel from "./components/InsightsPanel"
import UnusedFilesPanel from "./components/UnusedFilesPanel"
import DependencyLens from "./pages/DependencyLens"
import Architecture from "./pages/Architecture"
import GitHubImportModal from "./components/GitHubImportModel"
import GitActivity from "./pages/GitActivity"
import AIAssistant from "./pages/AIAssistant"
import Onboarding from "./pages/Onboarding"

import { buildIndex } from "./services/searchService"
import { findUnusedFiles } from "./services/unusedService"

const C = {
  bg: "#0a0c0f",
  surface: "#111318",
  border: "#1e2330",
  cyan: "#00e5ff",
  violet: "#9c6fff",
  green: "#00e676",
  red: "#ff4444",
  amber: "#ffb300",
  text: "#e2e8f0",
  muted: "#64748b",
}

const TABS = [
  { id: "dashboard",     label: "📊 Dashboard" },
  { id: "architecture",  label: "🗺 Architecture" },
  { id: "search",        label: "🔍 Search" },
  { id: "lens",          label: "🔭 Dependency Lens" },
  { id: "git",           label: "🔧 Git" },
  { id: "ai",            label: "🤖 AI Assistant" },
  { id: "onboarding",    label: "🎓 Onboarding" },
]

export default function App() {
  const { files, setFiles, selectFile } = useProjectStore()

  const [tab, setTab] = React.useState("dashboard")
  const [unusedFiles, setUnusedFiles] = React.useState([])
  const [scanning, setScanning] = React.useState(false)
  const [processed, setProcessed] = React.useState(0)
  const [showGitHub, setShowGitHub] = React.useState(false)
  const [cloneStatus, setCloneStatus] = React.useState(null) // { message, phase }

  // Listen to scan progress
  React.useEffect(() => {
    onScanProgress((p) => {
      setScanning(true)
      setProcessed(p.processed || 0)
    })
  }, [])

  // Listen to clone progress
  React.useEffect(() => {
    if (window.electronAPI?.onCloneProgress) {
      window.electronAPI.onCloneProgress((data) => {
        setCloneStatus(data)
      })
    }
  }, [])

  // ── Local import ─────────────────────────────────────────────────────────
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

  // ── GitHub import (called from modal) ────────────────────────────────────
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

  const clonePhaseColor = { cloning: C.amber, scanning: C.cyan, done: C.green }

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: C.bg,
      color: C.text,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: "10px 20px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: C.surface,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🧭</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: C.cyan, letterSpacing: "-0.5px" }}>
            CodeCompass
          </span>
          {files.length > 0 && (
            <span style={{
              background: `${C.green}18`, border: `1px solid ${C.green}40`,
              borderRadius: 10, color: C.green,
              fontSize: 10, padding: "2px 8px", marginLeft: 4,
            }}>
              {files.length} files loaded
            </span>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Clone status inline badge */}
          {cloneStatus && cloneStatus.phase !== "done" && (
            <span style={{
              fontSize: 11, color: clonePhaseColor[cloneStatus.phase] || C.cyan,
              background: `${clonePhaseColor[cloneStatus.phase] || C.cyan}15`,
              border: `1px solid ${clonePhaseColor[cloneStatus.phase] || C.cyan}40`,
              borderRadius: 8, padding: "4px 10px",
            }}>
              ⏳ {cloneStatus.message}
            </span>
          )}

          <button
            onClick={handleImport}
            disabled={scanning}
            style={{
              background: scanning ? C.border : `${C.cyan}15`,
              border: `1px solid ${scanning ? C.border : C.cyan}`,
              borderRadius: 8,
              color: scanning ? C.muted : C.cyan,
              padding: "8px 16px", fontSize: 12,
              cursor: scanning ? "not-allowed" : "pointer",
              fontFamily: "inherit", fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            {scanning ? `⏳ Scanning (${processed})...` : "📁 Import Project"}
          </button>

          <button
            onClick={() => setShowGitHub(true)}
            disabled={scanning}
            style={{
              background: `${C.violet}15`,
              border: `1px solid ${C.violet}60`,
              borderRadius: 8,
              color: C.violet,
              padding: "8px 16px", fontSize: 12,
              cursor: scanning ? "not-allowed" : "pointer",
              fontFamily: "inherit", fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            🐙 Import from GitHub
          </button>
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        gap: 2,
        padding: "0 16px",
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
        flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === t.id ? `2px solid ${C.cyan}` : "2px solid transparent",
              color: tab === t.id ? C.cyan : C.muted,
              padding: "11px 16px",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: tab === t.id ? 700 : 400,
              transition: "all 0.15s",
              letterSpacing: "0.02em",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── EMPTY STATE ──────────────────────────────────────────────────── */}
      {files.length === 0 && (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          color: C.muted,
        }}>
          <div style={{ fontSize: 56 }}>🧭</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>
            Welcome to CodeCompass
          </div>
          <div style={{ fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.8 }}>
            Import a local project folder or clone from GitHub to get started.
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              onClick={handleImport}
              style={{
                background: `${C.cyan}15`, border: `1px solid ${C.cyan}50`,
                borderRadius: 10, color: C.cyan,
                padding: "12px 24px", fontSize: 13,
                cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
              }}
            >
              📁 Import Local Project
            </button>
            <button
              onClick={() => setShowGitHub(true)}
              style={{
                background: `${C.violet}15`, border: `1px solid ${C.violet}50`,
                borderRadius: 10, color: C.violet,
                padding: "12px 24px", fontSize: 13,
                cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
              }}
            >
              🐙 Clone from GitHub
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      {files.length > 0 && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* LEFT: Main page content */}
          <div style={{ flex: 1, overflow: "auto", padding: 16 }}>

            {/* DASHBOARD */}
            {tab === "dashboard" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <StatsBar />
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ flex: "0 0 260px" }}>
                    <FileExplorer />
                  </div>
                  <div style={{ flex: 1 }}>
                    <CodePreview />
                  </div>
                </div>
                <LanguageChart />
              </div>
            )}

            {/* ARCHITECTURE */}
            {tab === "architecture" && (
              <Architecture />
            )}

            {/* SEARCH */}
            {tab === "search" && (
              <CodeSearch />
            )}

            {/* DEPENDENCY LENS */}
            {tab === "lens" && (
              <DependencyLens />
            )}

            {/* GIT ACTIVITY */}
            {tab === "git" && (
              <GitActivity />
            )}

            {/* AI ASSISTANT */}
            {tab === "ai" && (
              <AIAssistant />
            )}

            {/* ONBOARDING */}
            {tab === "onboarding" && (
              <Onboarding />
            )}

          </div>

          {/* RIGHT: Insights + Unused files panel */}
          <div style={{
            width: 280,
            borderLeft: `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
            background: C.surface,
            flexShrink: 0,
          }}>
            <InsightsPanel />
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              <UnusedFilesPanel
                files={unusedFiles}
                onSelect={(f) => selectFile(f)}
              />
            </div>
          </div>

        </div>
      )}

      {/* ── GITHUB MODAL ─────────────────────────────────────────────────── */}
      {showGitHub && (
        <GitHubImportModal
          onClose={() => setShowGitHub(false)}
          onImport={handleGitHubImport}
        />
      )}

    </div>
  )
}