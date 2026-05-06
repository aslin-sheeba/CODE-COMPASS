import React from "react"
import { T } from "../theme"

const fileName = p => (p || "").replace(/\\/g, "/").split("/").pop()

export default function CyclePanel({ cycles, onSelect }) {
  const [selected, setSelected] = React.useState(null)

  if (!cycles || !cycles.length) return null

  const handleClick = (cycle, i) => {
    const next = selected === i ? null : i
    setSelected(next)
    onSelect && onSelect(next === null ? null : cycle)
  }

  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.rMd, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px", borderBottom: `1px solid ${T.border}`,
        background: T.surfaceAlt,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13 }}>🔁</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: "monospace" }}>
            Circular Dependencies
          </span>
        </div>
        <span style={{
          padding: "2px 10px", borderRadius: 4,
          background: `${T.red}18`, border: `1px solid ${T.red}33`,
          color: T.red, fontSize: 10, fontFamily: "monospace", fontWeight: 700,
        }}>
          {cycles.length} cycle{cycles.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Warning banner */}
      <div style={{
        margin: "10px 14px 0",
        padding: "8px 10px", borderRadius: T.r,
        background: T.redLight, border: `1px solid ${T.redBorder}`,
        borderLeft: `3px solid ${T.red}`,
        fontSize: 11, color: T.textSub, lineHeight: 1.5,
      }}>
        ⚠️ Circular dependencies cause unpredictable module loading and hard-to-debug errors.
      </div>

      {/* Cycle list */}
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
        {cycles.map((cycle, i) => {
          const isSel = selected === i
          return (
            <div
              key={i}
              onClick={() => handleClick(cycle, i)}
              style={{
                padding: "10px 12px", borderRadius: T.r, cursor: "pointer",
                background: isSel ? T.redLight : T.surfaceAlt,
                border: `1px solid ${isSel ? T.redBorder : T.border}`,
                transition: "all 0.15s",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 7,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize: 9, color: T.red, fontFamily: "monospace", fontWeight: 700,
                    padding: "1px 6px", borderRadius: 3, background: `${T.red}18`,
                  }}>CYCLE {i + 1}</span>
                  <span style={{ fontSize: 9, color: T.textHint, fontFamily: "monospace" }}>
                    {cycle.length} files
                  </span>
                </div>
                {isSel && (
                  <span style={{ fontSize: 9, color: T.red, fontFamily: "monospace" }}>
                    highlighted ●
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                {cycle.map((node, j, arr) => (
                  <React.Fragment key={j}>
                    <span style={{
                      fontSize: 10, color: T.text, fontFamily: "monospace",
                      padding: "1px 6px", borderRadius: 3, background: T.border,
                    }}>{fileName(node)}</span>
                    {j < arr.length - 1 && (
                      <span style={{ fontSize: 10, color: T.red }}>→</span>
                    )}
                  </React.Fragment>
                ))}
                <span style={{ fontSize: 10, color: T.red }}>↩</span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{
        margin: "0 14px 12px",
        padding: "7px 10px", borderRadius: T.r,
        background: T.brandLight, border: `1px solid ${T.brandBorder}`,
        fontSize: 10, color: T.textHint, fontFamily: "monospace",
      }}>
        💡 Click a cycle to highlight it in the graph
      </div>
    </div>
  )
}
