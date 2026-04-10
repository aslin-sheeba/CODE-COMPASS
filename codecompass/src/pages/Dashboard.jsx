import React from "react"
import { useProjectStore } from "../state/projectStore"
import { T } from "../theme"
import StatsCards      from "../components/StatsCards"
import LanguageChart   from "../components/Dashboard/LanguageChart"
import InsightsPanel   from "../components/InsightsPanel"
import UnusedFilesPanel from "../components/UnusedFilesPanel"
import FileExplorer    from "../components/Dashboard/FileExplorer"
import CodePreview     from "../components/Dashboard/CodePreview"

export default function Dashboard({ unusedFiles = [] }) {
  const { files, selectFile } = useProjectStore()
  const [showInsights, setShowInsights] = React.useState(true)

  if (!files.length) return null

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: T.bg, overflow: "hidden",
    }}>
      {/* Top stats row */}
      <div style={{
        padding: "12px 16px", borderBottom: `1px solid ${T.border}`,
        background: T.surface, flexShrink: 0,
      }}>
        <StatsCards />
      </div>

      {/* Main body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: file explorer */}
        <div style={{
          width: 220, flexShrink: 0,
          borderRight: `1px solid ${T.border}`,
          background: T.surface,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <FileExplorer />
        </div>

        {/* Center: code preview + language chart */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{ flex: 1, overflow: "auto" }}>
            <CodePreview unusedFiles={unusedFiles} />
          </div>

          {/* Language chart strip */}
          {files.length > 0 && (
            <div style={{
              flexShrink: 0, borderTop: `1px solid ${T.border}`,
              padding: "10px 16px", background: T.surface,
            }}>
              <LanguageChart files={files} />
            </div>
          )}
        </div>

        {/* Right: insights + unused */}
        <div style={{
          width: 240, flexShrink: 0, display: "flex", flexDirection: "column",
          borderLeft: `1px solid ${T.border}`, overflow: "hidden",
        }}>
          {/* Insights toggle header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", borderBottom: `1px solid ${T.border}`,
            background: T.surfaceAlt, flexShrink: 0, cursor: "pointer",
          }} onClick={() => setShowInsights(v => !v)}>
            <span style={{
              fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
              color: T.textHint, fontWeight: 600,
            }}>Right Panel</span>
            <span style={{ fontSize: 11, color: T.textHint }}>{showInsights ? "▼" : "▶"}</span>
          </div>

          {showInsights && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
              <InsightsPanel />
              {unusedFiles.length > 0 && (
                <div style={{ padding: 12 }}>
                  <UnusedFilesPanel
                    files={unusedFiles.slice(0, 12)}
                    onSelect={selectFile}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
