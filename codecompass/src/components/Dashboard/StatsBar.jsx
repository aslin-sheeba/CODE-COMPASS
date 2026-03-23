import React from "react"
import { useProjectStore } from "../../state/projectStore"

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "#111620",
      border: "1px solid #1e2535",
      borderRadius: 8,
      padding: "14px 20px",
      flex: 1,
      borderTop: `2px solid ${color}`,
      minWidth: 0
    }}>
      <div style={{
        fontSize: 10, textTransform: "uppercase",
        letterSpacing: "0.12em", color: "#4a5570",
        fontFamily: "monospace", marginBottom: 8
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 26, fontWeight: 800,
        color, lineHeight: 1, fontFamily: "monospace"
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: 10, color: "#4a5570",
          fontFamily: "monospace", marginTop: 4
        }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ─── LANGUAGE BAR ─────────────────────────────────────────────────────────────
function LanguageBreakdown({ langCounts }) {
  const entries = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const max = entries[0]?.[1] || 1

  const langColor = (ext) => {
    const map = {
      tsx: "#00e5ff", ts: "#3b82f6", jsx: "#06b6d4",
      js: "#ffb300", css: "#9c6fff", json: "#00e676",
      md: "#f97316", html: "#ef4444"
    }
    return map[ext] || "#4a5570"
  }

  return (
    <div style={{
      background: "#111620", border: "1px solid #1e2535",
      borderRadius: 8, padding: "14px 18px", flex: 1, minWidth: 180
    }}>
      <div style={{
        fontSize: 10, textTransform: "uppercase",
        letterSpacing: "0.12em", color: "#4a5570",
        fontFamily: "monospace", marginBottom: 12
      }}>
        Languages
      </div>
      <div style={{
        display: "flex", flexDirection: "column", gap: 8
      }}>
        {entries.map(([ext, count]) => (
          <div key={ext} style={{
            display: "flex", alignItems: "center", gap: 8
          }}>
            <div style={{
              width: 28, fontSize: 10, color: langColor(ext),
              fontFamily: "monospace", textAlign: "right",
              flexShrink: 0
            }}>
              .{ext}
            </div>
            <div style={{
              flex: 1, height: 5, background: "#0a0c0f",
              borderRadius: 3, overflow: "hidden"
            }}>
              <div style={{
                height: "100%",
                width: `${(count / max) * 100}%`,
                background: langColor(ext),
                borderRadius: 3,
                transition: "width 0.6s ease"
              }} />
            </div>
            <div style={{
              width: 20, fontSize: 10, color: "#4a5570",
              fontFamily: "monospace", textAlign: "right",
              flexShrink: 0
            }}>
              {count}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── INTEGRITY RING ───────────────────────────────────────────────────────────
function IntegrityRing({ score }) {
  const r          = 28
  const circ       = 2 * Math.PI * r
  const offset     = circ - (score / 100) * circ
  const color      = score >= 80 ? "#00e676" : score >= 50 ? "#ffb300" : "#ff4444"
  const label      = score >= 80 ? "Healthy" : score >= 50 ? "Moderate" : "Critical"

  return (
    <div style={{
      background: "#111620", border: "1px solid #1e2535",
      borderRadius: 8, padding: "14px 20px",
      display: "flex", alignItems: "center",
      gap: 16, flex: 1, minWidth: 0
    }}>
      {/* Ring */}
      <svg width={70} height={70} style={{ flexShrink: 0 }}>
        {/* Background circle */}
        <circle
          cx={35} cy={35} r={r}
          fill="none" stroke="#1e2535" strokeWidth={5}
        />
        {/* Progress circle */}
        <circle
          cx={35} cy={35} r={r}
          fill="none" stroke={color} strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 35 35)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        {/* Score text */}
        <text
          x={35} y={35}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={13}
          fontWeight={800}
          fontFamily="monospace"
        >
          {score}
        </text>
      </svg>

      <div>
        <div style={{
          fontSize: 10, textTransform: "uppercase",
          letterSpacing: "0.12em", color: "#4a5570",
          fontFamily: "monospace", marginBottom: 4
        }}>
          Integrity Score
        </div>
        <div style={{
          fontSize: 16, fontWeight: 800, color, marginBottom: 2
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 10, color: "#4a5570", fontFamily: "monospace"
        }}>
          {score >= 80
            ? "Low coupling detected"
            : score >= 50
            ? "Some high-stress files"
            : "Refactoring needed"}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function StatsBar() {
  const { files } = useProjectStore()

  if (!files || files.length === 0) return null

  const totalFiles    = files.length
  const totalImports  = files.reduce((acc, f) => acc + (f.imports?.length || 0), 0)
  const avgImports    = totalFiles ? (totalImports / totalFiles).toFixed(1) : 0
  const highStress    = files.filter(f => (f._meta?.stressScore || 0) > 10).length
  const integrity     = totalFiles
    ? Math.max(0, Math.round((1 - highStress / totalFiles) * 100))
    : 100

  // Language breakdown
  const langCounts = files.reduce((acc, f) => {
    const ext = (f.path.match(/\.(\w+)$/) || [])[1] || "other"
    acc[ext] = (acc[ext] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ padding: "0 10px 0" }}>
      {/* Stat cards row */}
      <div style={{
        display: "flex", gap: 10, marginBottom: 10
      }}>
        <StatCard
          label="Total Files"
          value={totalFiles}
          color="#00e5ff"
        />
        <StatCard
          label="Total Imports"
          value={totalImports}
          color="#9c6fff"
        />
        <StatCard
          label="Avg Imports"
          value={avgImports}
          sub="per file"
          color="#ffb300"
        />
        <StatCard
          label="High Stress"
          value={highStress}
          sub="files with stress > 10"
          color="#ff4444"
        />
        <IntegrityRing score={integrity} />
        <LanguageBreakdown langCounts={langCounts} />
      </div>
    </div>
  )
}
