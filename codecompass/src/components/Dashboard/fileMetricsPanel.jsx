import React from "react"
import { useProjectStore } from "../../state/projectStore"
import { T } from "../../theme"
import { basename } from "../../utils"

const panelWrap = {
  width: 240, flexShrink: 0,
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

export default React.memo(function FileMetricsPanel({ unusedFiles, onSelectUnused }) {
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
        <MetricRow label="Fan-out"    value={fanOut}  valueColor={fanOut > 8  ? T.red : T.text} />
        <MetricRow label="Fan-in"     value={fanIn}   valueColor={fanIn  > 10 ? T.red : T.text} />
        <MetricRow label="Risk score" value={`${riskDisp} / 10`} valueColor={riskDisp > 7 ? T.red : riskDisp > 4 ? T.orange : T.text} />
        <MetricRow label="Depth"      value={depth}   valueColor={depth  > 5  ? T.orange : T.text} />
        <MetricRow label="Lines"      value={lines} />

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
                <span key={i} onClick={() => onSelectUnused && onSelectUnused(f)}
                  style={{ padding: "2px 8px", borderRadius: 4, background: T.pinkLight, border: `1px solid ${T.pinkBorder}`, color: T.pink, fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>
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

