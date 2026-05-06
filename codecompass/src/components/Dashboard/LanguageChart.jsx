import React, { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { T } from "../../theme"

const EXT_COLORS = {
  JSX: T.teal,  JS: T.orange, TSX: T.blue,  TS: T.blue,
  CSS: "#8b5cf6", JSON: T.green, HTML: T.amber, OTHER: T.textHint,
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.r, padding: "7px 12px",
      fontFamily: "monospace", fontSize: 11,
    }}>
      <div style={{ color: T.text, fontWeight: 600 }}>{label}</div>
      <div style={{ color: T.textSub }}>{payload[0].value} files</div>
    </div>
  )
}

/**
 * @param {{ files?: Array<{path:string}> }} props
 *   files — from useProjectStore().files  (preferred)
 *   languageStats — legacy prop, still accepted
 */
export default function LanguageChart({ files, languageStats }) {
  const chartData = useMemo(() => {
    let stats = languageStats

    // Build from files if passed (preferred path)
    if (!stats && files?.length) {
      stats = {}
      for (const f of files) {
        const ext = (f.path.match(/\.(\w+)$/) || [])[1]?.toUpperCase() || "OTHER"
        stats[ext] = (stats[ext] || 0) + 1
      }
    }

    return Object.entries(stats || {})
      .map(([key, value]) => ({ name: key, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)
  }, [files, languageStats])

  if (!chartData.length) return null

  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.rMd, padding: "14px 16px",
    }}>
      <div style={{
        fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
        color: T.textHint, fontFamily: "monospace", fontWeight: 600, marginBottom: 12,
      }}>
        Language Breakdown
      </div>

      <div style={{ width: "100%", height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: T.textSub, fontSize: 10, fontFamily: "monospace" }}
              axisLine={{ stroke: T.border }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: T.textHint, fontSize: 9, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: T.surfaceAlt }} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={EXT_COLORS[entry.name] || EXT_COLORS.OTHER} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
