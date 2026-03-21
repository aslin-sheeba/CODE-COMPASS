import React from "react"

export default function CyclePanel({ cycles, onSelect }) {
  if (!cycles || !cycles.length) return null

  return (
    <div style={{
      width: 300,
      borderLeft: "1px solid #ddd",
      padding: 10,
      background: "#fff"
    }}>
      <h3>🔁 Circular Dependencies</h3>

      {cycles.map((cycle, i) => (
        <div
          key={i}
          style={{
            padding: 8,
            marginBottom: 6,
            background: "#fff1f0",
            cursor: "pointer"
          }}
          onClick={() => onSelect(cycle)}
        >
          {cycle.map((c, idx) => (
            <span key={idx}>
              {c.split("/").pop()}
              {idx < cycle.length - 1 && " → "}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
