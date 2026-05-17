import React from "react"
import { importProject, onScanProgress } from "./services/projectService"
import { saveSession, loadSession, clearSession } from "./services/sessionService"
import { useProjectStore } from "./state/projectStore"
import { T } from "./theme"
import { pillStyle, basename } from "./utils"
import { addActivity } from "./components/Dashboard/ActivityFeed"

import FileExplorer      from "./components/Dashboard/FileExplorer"
import CodePreview       from "./components/Dashboard/CodePreview"
import HealthScoreCard   from "./components/Dashboard/HealthScoreCard"
import ActivityFeed      from "./components/Dashboard/ActivityFeed"
import QuickActions      from "./components/Dashboard/QuickActions"
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
import SessionToast      from "./components/SessionToast"
import FileMetricsPanel  from "./components/Dashboard/FileMetricsPanel"

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
    <div style={{ height: 3, background: T.surfaceAlt, flexShrink: 0, overflow: "hidden" }}>
      <div style={{
        height: "100%", background: T.brand,
        width: pct != null ? `${pct}%` : "40%",
        transition: pct != null ? "width 0.3s ease" : "none",
        animation: pct == null ? "scanPulse 1.4s ease-in-out infinite" : "none",
      }} />
      <style>{`@keyframes scanPulse{0%{transform:translateX(-100%);width:40%}100%{transform:translateX(350%);width:40%}}`}</style>
    </div>
  )
}

// ── Pill ──────────────────────────────────────────────────────────────────────
const Pill = React.memo(function Pill({ children, color = T.teal, bg = T.tealLight, border = T.tealBorder }) {
  return <span style={pillStyle({ color, bg, border })}>{children}</span>
})

// ── TopBar ────────────────────────────────────────────────────────────────────
const TopBar = React.memo(function TopBar({ files, scanning, processed, onImport, setShowGitHub, cloneStatus, projectRoot, onClearSession }) {
  return (
    <div style={S.topBar}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={S.logoText}>compass</span>
        <span style={{ fontSize: 10, color: T.textHint, fontFamily: "monospace" }}>v2</span>
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
        {files.length > 0 && (
          <button onClick={onClearSession} title="Clear session and start fresh" style={{
            ...S.btnBase, border: `1px solid ${T.border}`,
            background: T.surface, color: T.textHint, fontSize: 11,
          }}>start fresh</button>
        )}
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
        }}>clone github</button>
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
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>Welcome to CodeCompass v2</div>
        <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.7 }}>
          Import a local project or clone from GitHub.<br />
          <span style={{ color: T.textHint, fontSize: 11 }}>Your session will be saved automatically.</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onImport} style={{ padding: "9px 22px", borderRadius: T.rMd, border: `1px solid ${T.brandBorder}`, background: T.brandLight, color: T.brand, fontSize: 13, cursor: "pointer", fontFamily: "monospace", fontWeight: 600 }}>import project</button>
        <button onClick={onGitHub} style={{ padding: "9px 22px", borderRadius: T.rMd, border: `1px solid ${T.border}`, background: T.surface, color: T.textSub, fontSize: 13, cursor: "pointer", fontFamily: "monospace" }}>clone github</button>
      </div>
    </div>
  )
})

// ── Right panel (insights + unused + activity) ────────────────────────────────
function RightPanel({ unusedFiles }) {
  const { files, selectFile } = useProjectStore()
  const [showInsights, setShowInsights] = React.useState(true)

  return (
    <div style={{
      width: 240, flexShrink: 0, display: "flex", flexDirection: "column",
      borderLeft: `1px solid ${T.border}`, overflow: "hidden",
    }}>
      {/* Insights toggle */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", borderBottom: `1px solid ${T.border}`,
        background: T.surfaceAlt, flexShrink: 0, cursor: "pointer",
      }} onClick={() => setShowInsights(v => !v)}>
        <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, fontWeight: 600 }}>
          Insights
        </span>
        <span style={{ fontSize: 11, color: T.textHint }}>{showInsights ? "▼" : "▶"}</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
        {showInsights && <InsightsPanel />}
        {unusedFiles.length > 0 && (
          <div style={{ padding: 12 }}>
            <UnusedFilesPanel files={unusedFiles.slice(0, 12)} onSelect={selectFile} />
          </div>
        )}
        {/* Activity feed always visible */}
        <div style={{ padding: "8px 10px", borderTop: `1px solid ${T.border}` }}>
          <ActivityFeed onFileClick={selectFile} />
        </div>
      </div>
    </div>
  )
}

// ── Session save helpers ───────────────────────────────────────────────────────
function useBranch(projectRoot) {
  const [branch, setBranch] = React.useState("main")
  React.useEffect(() => {
    if (!projectRoot || !window.electronAPI?.getGitStatus) return
    window.electronAPI.getGitStatus(projectRoot).then(s => {
      if (s && s.branch) setBranch(s.branch)
    }).catch(() => {})
  }, [projectRoot])
  return branch
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const { files, setFiles, selectFile, selectedFile, projectRoot } = useProjectStore()

  const [tab,          setTabRaw]     = React.useState("dashboard")
  const [unusedFiles,  setUnusedFiles] = React.useState([])
  const [scanning,     setScanning]   = React.useState(false)
  const [processed,    setProcessed]  = React.useState(0)
  const [total,        setTotal]      = React.useState(0)
  const [showGitHub,   setShowGitHub] = React.useState(false)
  const [cloneStatus,  setCloneStatus] = React.useState(null)
  const [toastMsg,     setToastMsg]   = React.useState(null)
  const [resumeInfo,   setResumeInfo] = React.useState(null)

  const branch = useBranch(projectRoot)

  // Wrap setTab to also save session + log activity
  const setTab = React.useCallback((t) => {
    setTabRaw(t)
    if (t !== "dashboard") addActivity("search", `Navigated to ${t}`)
  }, [])

  // ── Session auto-save every 30 s + on tab change ─────────────────────────
  const doSave = React.useCallback(() => {
    if (!files.length || !projectRoot) return
    saveSession(projectRoot, branch, {
      tab,
      selectedFilePath: selectedFile?.path || null,
    })
  }, [files, projectRoot, branch, tab, selectedFile])

  React.useEffect(() => {
    doSave()
  }, [tab, selectedFile])   // save on every tab/file change

  React.useEffect(() => {
    const id = setInterval(doSave, 30_000)
    return () => clearInterval(id)
  }, [doSave])

  // ── Session restore after project load ────────────────────────────────────
  const tryRestoreSession = React.useCallback(async (loadedFiles, root) => {
    if (!root) return
    // get branch fresh
    let br = "main"
    if (window.electronAPI?.getGitStatus) {
      const s = await window.electronAPI.getGitStatus(root).catch(() => null)
      if (s?.branch) br = s.branch
    }
    const session = await loadSession(root, br)
    if (!session) return

    // Restore tab
    if (session.tab) setTabRaw(session.tab)

    // Restore selected file
    if (session.selectedFilePath) {
      const found = loadedFiles.find(f => f.path === session.selectedFilePath)
      if (found) selectFile(found)
    }

    // Show toast
    const savedAt = new Date(session.savedAt)
    const label   = savedAt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    setToastMsg(`Resumed from ${label}`)
    setResumeInfo(label)

    addActivity("session", `Session restored · ${label}`, { sub: `branch: ${session.branch || br}` })
  }, [selectFile])

  // ── Scan progress listener ────────────────────────────────────────────────
  React.useEffect(() => {
    onScanProgress((p) => {
      setScanning(true)
      setProcessed(p.processed || 0)
      if (p.total) setTotal(p.total)
    })
  }, [])

  React.useEffect(() => {
    if (!window.electronAPI?.onCloneProgress) return
    window.electronAPI.onCloneProgress((data) => setCloneStatus(data))
  }, [])

  // ── Log file opens to activity feed ──────────────────────────────────────
  React.useEffect(() => {
    if (!selectedFile) return
    const name = selectedFile.path.replace(/\\/g, "/").split("/").pop()
    addActivity("file_open", name, {
      file: selectedFile,
      sub: `stress ${selectedFile._meta?.stressScore || 0}`,
    })
  }, [selectedFile])

  // ── Import project ────────────────────────────────────────────────────────
  const handleImport = React.useCallback(async () => {
    setScanning(true); setProcessed(0); setTotal(0)
    const result = await importProject()
    if (result) {
      setFiles(result)
      buildIndex(result)
      setUnusedFiles(findUnusedFiles(result))
      setTabRaw("dashboard")
      addActivity("import", `Project imported · ${result.length} files`)
      // Try to restore session after a tick (so projectRoot is set)
      setTimeout(() => tryRestoreSession(result, useProjectStore.getState().projectRoot), 100)
    }
    setScanning(false)
  }, [setFiles, tryRestoreSession])

  const handleGitHubImport = React.useCallback((result) => {
    if (result) {
      setFiles(result)
      buildIndex(result)
      setUnusedFiles(findUnusedFiles(result))
      setTabRaw("dashboard")
      addActivity("import", `GitHub project imported · ${result.files?.length || 0} files`)
      setTimeout(() => tryRestoreSession(result.files || result, useProjectStore.getState().projectRoot), 100)
    }
    setShowGitHub(false)
    setCloneStatus(null)
  }, [setFiles, tryRestoreSession])

  // ── Clear session ─────────────────────────────────────────────────────────
  const handleClearSession = React.useCallback(async () => {
    if (!projectRoot) return
    await clearSession(projectRoot)
    setResumeInfo(null)
    setToastMsg(null)
    addActivity("session", "Session cleared — starting fresh")
  }, [projectRoot])

  return (
    <div style={{ ...S.root, background: T.bg, color: T.text }}>
      <TopBar
        files={files} scanning={scanning} processed={processed}
        onImport={handleImport} setShowGitHub={setShowGitHub}
        cloneStatus={cloneStatus} projectRoot={projectRoot}
        onClearSession={handleClearSession}
      />

      <ScanProgressBar scanning={scanning} processed={processed} total={total} />

      {files.length === 0 ? (
        <Welcome onImport={handleImport} onGitHub={() => setShowGitHub(true)} />
      ) : (
        <>
          <TabBar tab={tab} setTab={setTab} selectedFile={selectedFile} />

          {/* Dashboard header zone */}
          {tab === "dashboard" && (
            <div style={{
              padding: "10px 16px 0",
              borderBottom: `1px solid ${T.border}`,
              background: T.surface, flexShrink: 0,
            }}>
              <HealthScoreCard onSelectFile={selectFile} />
              <QuickActions
                onNavigate={setTab}
                onSelectFile={selectFile}
                resumeInfo={resumeInfo}
              />
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
              <>
                <RightPanel unusedFiles={unusedFiles} />
                <FileMetricsPanel unusedFiles={unusedFiles} onSelectUnused={selectFile} />
              </>
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

      {/* Session restore toast */}
      <SessionToast message={toastMsg} onDismiss={() => setToastMsg(null)} />
    </div>
  )
}
