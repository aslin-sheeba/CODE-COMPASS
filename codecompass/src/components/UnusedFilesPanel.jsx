import React from "react"
import { T } from "../theme"

const fileName = p => (p || "").replace(/\\/g, "/").split("/").pop()
const fileDir  = p => {
  const parts = (p || "").replace(/\\/g, "/").split("/")
  return parts.length > 1 ? parts.slice(0, -1).join("/") : ""
}

export default function UnusedFilesPanel({ files, onSelect }) {
  const [selected, setSelected] = React.useState(null)

  if (!files || !files.length) return null

  const handleClick = (f) => {
    setSelected(f.path)
    onSelect && onSelect(f)
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
          <span style={{ fontSize: 13 }}>🧩</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: "monospace" }}>
            Unused Files
          </span>
        </div>
        <span style={{
          padding: "2px 10px", borderRadius: 4,
          background: T.orangeLight, border: `1px solid ${T.orangeBorder}`,
          color: T.orange, fontSize: 10, fontFamily: "monospace", fontWeight: 700,
        }}>
          {files.length}
        </span>
      </div>

      {/* Info */}
      <div style={{
        margin: "10px 14px 0",
        padding: "7px 10px", borderRadius: T.r,
        background: T.amberLight, border: `1px solid ${T.amberBorder}`,
        borderLeft: `3px solid ${T.amber}`,
        fontSize: 10, color: T.textSub, lineHeight: 1.5,
      }}>
        These files have zero incoming imports. They may be dead code or entry points.
      </div>

      {/* File list */}
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
        {files.map((f, i) => {
          const isSel = selected === f.path
          const name  = fileName(f.path)
          const dir   = fileDir(f.path)
          const ext   = (name.split(".").pop() || "").toUpperCase()

          return (
            <div
              key={i}
              onClick={() => handleClick(f)}
              style={{
                padding: "8px 10px", borderRadius: T.r, cursor: "pointer",
                background: isSel ? T.orangeLight : T.surfaceAlt,
                border: `1px solid ${isSel ? T.orangeBorder : T.border}`,
                display: "flex", alignItems: "center", gap: 8,
                transition: "all 0.12s",
              }}
            >
              <span style={{
                fontSize: 9, fontWeight: 700, fontFamily: "monospace",
                padding: "1px 5px", borderRadius: 3,
                background: T.pinkLight, border: `1px solid ${T.pinkBorder}`,
                color: T.pink, flexShrink: 0,
              }}>{ext}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11, color: T.text, fontFamily: "monospace",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  fontWeight: isSel ? 600 : 400,
                }}>{name}</div>
                {dir && (
                  <div style={{
                    fontSize: 9, color: T.textHint, fontFamily: "monospace",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    marginTop: 1,
                  }}>{dir}</div>
                )}
              </div>
              {f.lines && (
                <span style={{ fontSize: 9, color: T.textHint, fontFamily: "monospace", flexShrink: 0 }}>
                  {f.lines}L
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
