import React from "react"
import { importProject, onScanProgress } from "./services/projectService"
import { useProjectStore } from "./state/projectStore"
import { T } from "./theme"
import { pillStyle, basename } from "./utils"

import FileExplorer   from "./components/Dashboard/FileExplorer"
import CodePreview    from "./components/Dashboard/CodePreview"
import CodeSearch     from "./pages/CodeSearch"
import DependencyLens from "./pages/DependencyLens"
import Architecture   from "./pages/Architecture"
import GitHubImportModal from "./components/GitHubImportModel"
import GitActivity    from "./pages/GitActivity"
import AIAssistant    from "./pages/AIAssistant"
import Onboarding     from "./pages/Onboarding"
import ErrorBoundary  from "./components/ErrorBoundary"

import { buildIndex }      from "./services/searchService"
import { findUnusedFiles } from "./services/unusedService"

// ── Hoisted static styles (#15) ─────────────────────────────────────────────
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
  bodyWrap:  { flex: 1, display: "flex", overflow: "hidden", background: T.bg },
  leftPane:  { width: 220, flexShrink: 0, borderRight: `1px solid ${T.border}`, background: T.surface, display: "flex", flexDirection: "column", overflow: "hidden" },
  centerPane:{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" },
  btnBase: {
    padding: "5px 14px", borderRadius: T.r,
    fontSize: 12, fontFamily: "monospace", cursor: "pointer",
  },
}

// ── Pill ─────────────────────────────────────────────────────────────────────
const Pill = React.memo(function Pill({ children, color = T.teal, bg = T.tealLight, border = T.tealBorder }) {
  return <span style={pillStyle({ color, bg, border })}>{children}</span>
})

// ── TopBar ────────────────────────────────────────────────────────────────────
const TopBar = React.memo(function TopBar({ files, scanning, processed, onImport, setShowGitHub, cloneStatus }) {
  return (
    <div style={{ ...S.topBar, background: T.surface }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={S.logoText}>compass</span>
        {files.length > 0 && <Pill>{files.length} files</Pill>}
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
  { id: "dashboard",    labelFn: (sf) => sf ? basename(sf.path) : "App.jsx" },
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

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { files, setFiles, selectFile, selectedFile } = useProjectStore()

  const [tab,         setTab]         = React.useState("dashboard")
  const [unusedFiles, setUnusedFiles] = React.useState([])
  const [scanning,    setScanning]    = React.useState(false)
  const [processed,   setProcessed]   = React.useState(0)
  const [showGitHub,  setShowGitHub]  = React.useState(false)
  const [cloneStatus, setCloneStatus] = React.useState(null)

  // FIX: preload.js uses removeAllListeners before registering, so the listener
  // is already de-duplicated there. We still return a no-op cleanup to satisfy
  // React's strict-mode double-invocation and prevent any future regressions.
  React.useEffect(() => {
    onScanProgress((p) => { setScanning(true); setProcessed(p.processed || 0) })
    return () => {
      // Listener is cleared by preload's makeListener on next registration.
      // Explicit noop return keeps React happy in StrictMode double-invoke.
    }
  }, [])

  React.useEffect(() => {
    if (!window.electronAPI?.onCloneProgress) return
    window.electronAPI.onCloneProgress((data) => setCloneStatus(data))
  }, [])

  const handleImport = React.useCallback(async () => {
    setScanning(true)
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

      {files.length === 0 ? (
        <Welcome onImport={handleImport} onGitHub={() => setShowGitHub(true)} />
      ) : (
        <>
          <TabBar tab={tab} setTab={setTab} selectedFile={selectedFile} />
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

// ── FileMetricsPanel ──────────────────────────────────────────────────────────
const panelWrap = {
  width: 220, flexShrink: 0,
  borderLeft: `1px solid ${T.border}`,
  background: T.surface,
  display: "flex", flexDirection: "column",
  overflow: "hidden",
}
const panelHeader = {
  padding: "10px 14px", borderBottom: `1px solid ${T.border}`,
  fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
  color: T.textHint, fontWeight: 600,
}

function MetricRow({ label, value, valueColor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 11, color: T.textSub }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace", color: valueColor || T.text }}>{value}</span>
    </div>
  )
}

function DotList({ items, color }) {
  if (!items.length) return <div style={{ fontSize: 10, color: T.textHint, padding: "4px 0" }}>none</div>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((item, i) => {
        const name = typeof item === "string" ? basename(item) : basename(item.path)
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: T.textSub, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          </div>
        )
      })}
    </div>
  )
}

const FileMetricsPanel = React.memo(function FileMetricsPanel({ unusedFiles, onSelectUnused }) {
  const { selectedFile, files } = useProjectStore()

  if (!selectedFile) {
    return (
      <div style={panelWrap}>
        <div style={panelHeader}>file metrics</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.textHint, fontSize: 11, textAlign: "center", padding: 20 }}>
          select a file to see metrics
        </div>
      </div>
    )
  }

  const meta    = selectedFile._meta || {}
  const imports = selectedFile.imports || []
  const myBase  = basename(selectedFile.path).replace(/\.[^.]+$/, "")
  const usedBy  = files.filter(f =>
    (f.imports || []).some(imp => basename(imp).replace(/\.[^.]+$/, "") === myBase)
  )

  const fanOut   = imports.filter(i => !i.startsWith(".") && !i.startsWith("/")).length
  const fanIn    = meta.incoming || 0
  const risk     = meta.stressScore || 0
  const riskDisp = Math.min(Math.round(risk / 4), 10)
  const depth    = Math.min(imports.length, 8)
  const lines    = selectedFile.lines || 0

  const localImports = imports.filter(i => i.startsWith(".") || i.startsWith("/")).slice(0, 5)
  const usedByList   = usedBy.slice(0, 3)

  return (
    <div style={panelWrap}>
      <div style={panelHeader}>file metrics</div>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
        <MetricRow label="Fan-out"      value={fanOut}  valueColor={fanOut > 8  ? T.red : T.text} />
        <MetricRow label="Fan-in"       value={fanIn}   valueColor={fanIn  > 10 ? T.red : T.text} />
        <MetricRow label="Risk score"   value={`${riskDisp} / 10`} valueColor={riskDisp > 7 ? T.red : riskDisp > 4 ? T.orange : T.text} />
        <MetricRow label="Depth"        value={depth}   valueColor={depth  > 5  ? T.orange : T.text} />
        <MetricRow label="Lines"        value={lines} />
        <MetricRow label="Last changed" value="—" />

        <div style={{ marginTop: 14, marginBottom: 6 }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, fontWeight: 600, marginBottom: 8 }}>imports</div>
          <DotList items={localImports} color={T.orange} />
          {imports.length > 5 && <div style={{ fontSize: 10, color: T.textHint, marginTop: 4 }}>+{imports.length - 5} more</div>}
        </div>

        <div style={{ marginTop: 14, marginBottom: 6 }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, fontWeight: 600, marginBottom: 8 }}>used by</div>
          <DotList items={usedByList} color={T.teal} />
        </div>

        {unusedFiles?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, fontWeight: 600, marginBottom: 8 }}>unused files</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {unusedFiles.slice(0, 8).map((f, i) => (
                <span key={i} onClick={() => onSelectUnused && onSelectUnused(f)} style={{ padding: "2px 8px", borderRadius: 4, background: T.pinkLight, border: `1px solid ${T.pinkBorder}`, color: T.pink, fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>
                  {basename(f.path)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})