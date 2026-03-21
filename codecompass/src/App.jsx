import React from "react"
import { importProject, onScanProgress } from "./services/projectService"
import { useProjectStore } from "./state/projectStore"

import StatsBar from "./components/Dashboard/StatsBar"
import FileExplorer from "./components/Dashboard/FileExplorer"
import CodePreview from "./components/Dashboard/CodePreview"
import CodeSearch from "./pages/CodeSearch"
import ModuleGraph from "./components/ModuleGraph"
import InsightsPanel from "./components/InsightsPanel"
import UnusedFilesPanel from "./components/UnusedFilesPanel"

import { buildIndex } from "./services/searchService"
import { findUnusedFiles } from "./services/unusedService"
import DependencyLens from "./components/DependencyLens"
function App() {
  const { files, setFiles, selectFile } = useProjectStore()

  const [tab, setTab] = React.useState("dashboard")

  const [unusedFiles, setUnusedFiles] = React.useState([])

  const [scanning, setScanning] = React.useState(false)
  const [processed, setProcessed] = React.useState(0)

  React.useEffect(() => {
    onScanProgress((p) => {
      setScanning(true)
      setProcessed(p.processed || 0)
    })
  }, [])

  const handleImport = async () => {
    setScanning(true)
    const result = await importProject()

    if (result) {
      setFiles(result)
      buildIndex(result)

      const unused = findUnusedFiles(result)
      setUnusedFiles(unused)
    }

    setScanning(false)
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>

      {/* 🔝 TOP BAR */}
      <div style={{
        padding: 12,
        borderBottom: "1px solid #ddd",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <h2>🚀 CodeCompass</h2>

        <button onClick={handleImport} disabled={scanning}>
          {scanning ? `Scanning (${processed})` : "Import Project"}
        </button>
      </div>

      {/* 🧭 TABS */}
      <div style={{
        display: "flex",
        gap: 10,
        padding: 10,
        borderBottom: "1px solid #eee"
      }}>
        <button onClick={() => setTab("dashboard")}>Dashboard</button>
        <button onClick={() => setTab("architecture")}>Architecture</button>
        <button onClick={() => setTab("search")}>Search</button>
        <button onClick={() => setActiveTab("lens")}>
                    Lens
                  </button>
      </div>

      {/* 📦 MAIN CONTENT */}
      <div style={{ flex: 1, display: "flex" }}>

        {/* LEFT CONTENT */}
        <div style={{ flex: 1, padding: 10 }}>

          {tab === "dashboard" && files.length > 0 && (
            <>
              <StatsBar />
              <div style={{ display: "flex", marginTop: 10 }}>
                <FileExplorer />
                <CodePreview />
              </div>
            </>
          )}

          {tab === "architecture" && files.length > 0 && (
            <ModuleGraph />
          )}

          {tab === "search" && (
            <CodeSearch />
          )}

        </div>

        {/* RIGHT PANEL */}
        {files.length > 0 && (
          <div style={{
            width: 300,
            borderLeft: "1px solid #ddd",
            padding: 10
          }}>
            <InsightsPanel />
            <UnusedFilesPanel
              files={unusedFiles}
              onSelect={(f) => selectFile(f)}
            />
          </div>
        )}

      </div>

    </div>
  )
}

export default App

