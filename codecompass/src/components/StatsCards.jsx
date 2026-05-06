import React from "react"
import { useProjectStore } from "../state/projectStore"
import { T } from "../theme"

function Card({ label, value, sub, color, icon }) {
  return (
    <div style={{
      flex: 1, background: T.surface,
      border: `1px solid ${T.border}`,
      borderTop: `2px solid ${color}`,
      borderRadius: T.rMd, padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: 2,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        {icon && <span style={{ fontSize: 12 }}>{icon}</span>}
        <span style={{
          fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
          color: T.textHint, fontFamily: "monospace", fontWeight: 600,
        }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "monospace", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: T.textHint, fontFamily: "monospace", marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function StatsCards() {
  const { files } = useProjectStore()

  const totalFiles    = files.length
  const totalImports  = files.reduce((a, f) => a + (f.imports?.length || 0), 0)
  const highRisk      = files.filter(f => (f._meta?.stressScore || 0) > 20).length
  const unusedFiles   = files.filter(f =>
    (f._meta?.incoming || 0) === 0 &&
    !["App.", "main.", "index."].some(x => f.path.includes(x))
  ).length
  const totalLines    = files.reduce((a, f) => a + (f.lines || 0), 0)
  const avgImports    = totalFiles ? Math.round(totalImports / totalFiles) : 0

  if (!files.length) return null

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Card label="Total Files"   value={totalFiles}                color={T.blue}   icon="📁" />
      <Card label="Dependencies"  value={totalImports}              color="#8b5cf6"  icon="🔗" />
      <Card label="High Risk"     value={highRisk}  sub="stress > 20" color={T.red}    icon="🔥" />
      <Card label="Unused Files"  value={unusedFiles} sub="zero fan-in" color={T.orange} icon="👻" />
      <Card label="Total Lines"   value={totalLines.toLocaleString()} color={T.teal}   icon="📝" />
      <Card label="Avg Imports"   value={avgImports} sub="per file"  color={T.green}  icon="📊" />
    </div>
  )
}
