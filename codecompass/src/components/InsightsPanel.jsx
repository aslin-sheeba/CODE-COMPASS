import React from "react"
import { useProjectStore } from "../state/projectStore"
import { T } from "../theme"

const Label = ({ children }) => (
  <div style={{
    fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
    color: T.textHint, fontFamily: "monospace", fontWeight: 600, marginBottom: 6,
  }}>{children}</div>
)

function MetricRow({ label, value, color }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "5px 0", borderBottom: `1px solid ${T.border}`,
    }}>
      <span style={{ fontSize: 11, color: T.textSub }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: color || T.text }}>{value}</span>
    </div>
  )
}

function ImportItem({ path }) {
  const name = path.replace(/\\/g, "/").split("/").pop()
  const isExternal = !path.startsWith(".") && !path.startsWith("/")
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
      <div style={{
        width: 6, height: 6, borderRadius: 2, flexShrink: 0,
        background: isExternal ? T.blue : T.orange,
      }} />
      <span style={{
        fontSize: 10, color: T.textSub, fontFamily: "monospace",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{name}</span>
      {isExternal && (
        <span style={{
          fontSize: 8, color: T.blue, background: T.blueLight,
          border: `1px solid ${T.blueBorder}`, borderRadius: 3, padding: "0 4px",
          flexShrink: 0, fontFamily: "monospace",
        }}>pkg</span>
      )}
    </div>
  )
}

export default function InsightsPanel() {
  const { files, selectedFile } = useProjectStore()

  if (!selectedFile) {
    return (
      <div style={{
        width: 240, background: T.surface, borderLeft: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column",
      }}>
        <div style={{
          padding: "10px 14px", borderBottom: `1px solid ${T.border}`,
          fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
          color: T.textHint, fontWeight: 600,
        }}>🧠 Insights</div>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          color: T.textHint, fontSize: 11, textAlign: "center", padding: 20,
          fontFamily: "monospace",
        }}>
          select a file<br />to see insights
        </div>
      </div>
    )
  }

  const imports  = selectedFile.imports || []
  const meta     = selectedFile._meta   || {}
  const usedBy   = files.filter(f =>
    (f.imports || []).some(imp =>
      imp.replace(/\\/g, "/").split("/").pop().replace(/\.[^.]+$/, "") ===
      selectedFile.path.replace(/\\/g, "/").split("/").pop().replace(/\.[^.]+$/, "")
    )
  )

  const fanOut   = imports.length
  const fanIn    = meta.incoming || usedBy.length
  const score    = meta.stressScore || 0
  const riskDisp = Math.min(Math.round(score / 4), 10)
  const riskColor = riskDisp > 7 ? T.red : riskDisp > 4 ? T.orange : T.green

  const local    = imports.filter(i => i.startsWith(".") || i.startsWith("/"))
  const external = imports.filter(i => !i.startsWith(".") && !i.startsWith("/"))

  const insights = []
  if (score > 20)           insights.push({ icon: "🔴", text: "Critical stress — refactoring priority", color: T.red })
  else if (score > 10)      insights.push({ icon: "🟡", text: "Moderate stress — monitor coupling",     color: T.orange })
  if (fanIn >= 3)           insights.push({ icon: "🔥", text: `Core module — ${fanIn} files depend on it`, color: T.blue })
  if (!fanIn && !["App.", "main.", "index."].some(x => selectedFile.path.includes(x)))
                            insights.push({ icon: "👻", text: "Possibly unused — zero incoming imports", color: "#8b5cf6" })
  if (imports.length > 5)   insights.push({ icon: "⚠️", text: `High fan-out — ${imports.length} imports`, color: T.orange })
  if (!insights.length)     insights.push({ icon: "✅", text: "Healthy — no issues detected",           color: T.green })

  const fileName = selectedFile.path.replace(/\\/g, "/").split("/").pop()

  return (
    <div style={{
      width: 240, background: T.surface, borderLeft: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px", borderBottom: `1px solid ${T.border}`,
        background: T.surfaceAlt, flexShrink: 0,
      }}>
        <div style={{
          fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
          color: T.textHint, fontWeight: 600, marginBottom: 4,
        }}>🧠 Insights</div>
        <div style={{
          fontSize: 11, fontWeight: 700, color: T.text, fontFamily: "monospace",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{fileName}</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
        {/* Stress bar */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <Label>Risk Score</Label>
            <span style={{ fontSize: 11, fontWeight: 700, color: riskColor, fontFamily: "monospace" }}>
              {riskDisp}/10
            </span>
          </div>
          <div style={{ height: 5, background: T.surfaceAlt, borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3,
              width: `${riskDisp * 10}%`,
              background: riskColor, transition: "width 0.4s ease",
            }} />
          </div>
        </div>

        {/* Metrics */}
        <div style={{ marginBottom: 12 }}>
          <MetricRow label="Fan-Out"    value={fanOut}              color={fanOut > 8  ? T.red : undefined} />
          <MetricRow label="Fan-In"     value={fanIn}               color={fanIn  > 10 ? T.red : undefined} />
          <MetricRow label="Local"      value={local.length}        color={T.orange} />
          <MetricRow label="External"   value={external.length}     color={T.blue} />
          <MetricRow label="Lines"      value={selectedFile.lines || "—"} />
        </div>

        {/* AI insights */}
        <div style={{ marginBottom: 12 }}>
          <Label>Analysis</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{
                padding: "6px 8px", borderRadius: T.r,
                background: T.surfaceAlt,
                border: `1px solid ${ins.color}22`,
                borderLeft: `3px solid ${ins.color}`,
                display: "flex", gap: 6, alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 10, flexShrink: 0 }}>{ins.icon}</span>
                <span style={{ fontSize: 10, color: T.textSub, lineHeight: 1.4 }}>{ins.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Imports list */}
        {local.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <Label>Local Imports ({local.length})</Label>
            {local.slice(0, 6).map((imp, i) => <ImportItem key={i} path={imp} />)}
            {local.length > 6 && (
              <div style={{ fontSize: 10, color: T.textHint, marginTop: 4 }}>+{local.length - 6} more</div>
            )}
          </div>
        )}

        {/* Used by */}
        {usedBy.length > 0 && (
          <div>
            <Label>Used By ({usedBy.length})</Label>
            {usedBy.slice(0, 5).map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
                <div style={{ width: 6, height: 6, borderRadius: 2, background: T.teal, flexShrink: 0 }} />
                <span style={{
                  fontSize: 10, color: T.textSub, fontFamily: "monospace",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {f.path.replace(/\\/g, "/").split("/").pop()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
