// src/components/Dashboard/HealthScoreCard.jsx
// Enriched stats bar: integrity ring, coupling, churn risk, dead-code %, quick metrics
import React from "react"
import { useProjectStore } from "../../state/projectStore"
import { T } from "../../theme"

// ── Tiny ring SVG ─────────────────────────────────────────────────────────────
function Ring({ score, size = 54 }) {
  const r      = (size / 2) - 5
  const circ   = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color  = score >= 75 ? T.teal : score >= 45 ? T.amber : T.red
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={12} fontWeight={700} fontFamily="monospace">{score}</text>
    </svg>
  )
}

// ── Metric pill ────────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color, icon, trend }) {
  return (
    <div style={{
      flex: 1, minWidth: 90,
      background: T.surface, border: `1px solid ${T.border}`,
      borderTop: `2px solid ${color}`, borderRadius: T.rMd,
      padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, fontWeight: 600 }}>
          {icon} {label}
        </span>
        {trend != null && (
          <span style={{ fontSize: 10, color: trend === "up" ? T.red : trend === "down" ? T.teal : T.textHint }}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"}
          </span>
        )}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "monospace", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: T.textHint, fontFamily: "monospace", marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

// ── Language bar (compact) ────────────────────────────────────────────────────
const LANG_COLOR = {
  tsx:"#2e9e7a", ts:"#4a7cc9", jsx:"#2e9e7a", js:"#e07b2e",
  py:"#4b8bbe", rs:"#ce422b", go:"#00acd7", rb:"#cc342d",
  css:"#8b5cf6", json:"#2e8a5a", md:"#e07b2e", html:"#d04040",
}

function LangBar({ files }) {
  const counts = React.useMemo(() => {
    const map = {}
    for (const f of files) {
      const ext = (f.path.match(/\.(\w+)$/) || [])[1] || "other"
      map[ext] = (map[ext] || 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [files])

  const max = counts[0]?.[1] || 1
  return (
    <div style={{
      flex: 1, minWidth: 140, background: T.surface, border: `1px solid ${T.border}`,
      borderTop: `2px solid ${T.blue}`, borderRadius: T.rMd, padding: "10px 12px",
    }}>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, fontWeight: 600, marginBottom: 8 }}>
        🗂 Languages
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {counts.map(([ext, count]) => (
          <div key={ext} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, color: LANG_COLOR[ext] || T.textHint, fontFamily: "monospace", width: 26, textAlign: "right", flexShrink: 0 }}>.{ext}</span>
            <div style={{ flex: 1, height: 4, background: T.surfaceAlt, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round((count / max) * 100)}%`, background: LANG_COLOR[ext] || T.textHint, borderRadius: 2, transition: "width 0.5s ease" }} />
            </div>
            <span style={{ fontSize: 9, color: T.textHint, fontFamily: "monospace", width: 18, textAlign: "right", flexShrink: 0 }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Integrity card ─────────────────────────────────────────────────────────────
function IntegrityCard({ score }) {
  const label = score >= 75 ? "Healthy" : score >= 45 ? "Moderate" : "Critical"
  const color = score >= 75 ? T.teal    : score >= 45 ? T.amber    : T.red
  const hint  = score >= 75 ? "Low coupling detected" : score >= 45 ? "Some high-stress files" : "Refactoring needed"
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderTop: `2px solid ${color}`, borderRadius: T.rMd,
      padding: "10px 12px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
    }}>
      <Ring score={score} />
      <div>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, fontWeight: 600, marginBottom: 3 }}>Project Health</div>
        <div style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 9, color: T.textHint, fontFamily: "monospace" }}>{hint}</div>
      </div>
    </div>
  )
}

// ── Hot-files heatmap strip ───────────────────────────────────────────────────
function HeatmapStrip({ files, onSelect }) {
  const top20 = React.useMemo(() =>
    [...files].sort((a, b) => (b._meta?.stressScore || 0) - (a._meta?.stressScore || 0)).slice(0, 24)
  , [files])

  if (!top20.length) return null
  const max = top20[0]._meta?.stressScore || 1

  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, fontWeight: 600 }}>
        🔥 Hot files (stress heatmap)
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {top20.map(f => {
          const s    = f._meta?.stressScore || 0
          const pct  = Math.round((s / max) * 100)
          const bg   = s > 15 ? T.red : s > 8 ? T.orange : T.teal
          const name = f.path.replace(/\\/g, "/").split("/").pop()
          return (
            <div key={f.path} title={`${name} — stress ${s}`}
              onClick={() => onSelect && onSelect(f)}
              style={{
                width: 22, height: 22, borderRadius: 4, cursor: "pointer",
                background: `${bg}${Math.round(30 + pct * 1.7).toString(16).padStart(2,"0")}`,
                border: `1px solid ${bg}55`,
                transition: "transform 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.25)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function HealthScoreCard({ onSelectFile }) {
  const { files, selectFile } = useProjectStore()
  if (!files.length) return null

  const totalFiles   = files.length
  const totalImports = files.reduce((a, f) => a + (f.imports?.length || 0), 0)
  const totalLines   = files.reduce((a, f) => a + (f.lines || 0), 0)
  const highStress   = files.filter(f => (f._meta?.stressScore || 0) > 10).length
  const unused       = files.filter(f =>
    (f._meta?.incoming || 0) === 0 &&
    !["App.", "main.", "index."].some(x => f.path.includes(x))
  ).length
  const integrity    = Math.max(0, Math.round((1 - highStress / totalFiles) * 100))
  const avgImports   = totalFiles ? Math.round(totalImports / totalFiles) : 0
  const deadCodePct  = Math.round((unused / totalFiles) * 100)

  const handleSelect = (f) => { selectFile(f); onSelectFile?.(f) }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Row 1: metric cards */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <IntegrityCard score={integrity} />
        <MetricCard label="Total Files"  value={totalFiles}                    color={T.blue}   icon="📁" />
        <MetricCard label="Total Lines"  value={totalLines.toLocaleString()}   color={T.teal}   icon="📝" />
        <MetricCard label="Dependencies" value={totalImports}                  color="#8b5cf6"  icon="🔗" />
        <MetricCard label="Avg Imports"  value={avgImports} sub="per file"     color={T.green}  icon="📊" />
        <MetricCard label="High Stress"  value={highStress} sub="score > 10"   color={T.red}    icon="🔥" trend={highStress > totalFiles * 0.2 ? "up" : "down"} />
        <MetricCard label="Dead Code"    value={`${deadCodePct}%`} sub={`${unused} unused`} color={T.orange} icon="👻" />
        <LangBar files={files} />
      </div>

      {/* Row 2: heatmap strip */}
      <HeatmapStrip files={files} onSelect={handleSelect} />
    </div>
  )
}
