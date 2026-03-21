import React from "react"

export default function UnusedFilesPanel({ files, onSelect }) {
  if (!files || !files.length) return null

  return (
    <div style={{
      width: 280,
      borderLeft: "1px solid #ddd",
      padding: 10,
      background: "#fff"
    }}>
      <h3>🧩 Unused Files</h3>

      {files.map((f, i) => (
        <div
          key={i}
          style={{
            padding: 6,
            marginBottom: 4,
            background: "#fffbe6",
            cursor: "pointer"
          }}
          onClick={() => onSelect && onSelect(f)}
        >
          {f.path.split("/").pop()}
        </div>
      ))}
    </div>
  )
}
