import React from "react"
import { useProjectStore } from "../state/projectStore"

export default function DependencyLens() {
  const { files, selectedFile } = useProjectStore()

  // 🚫 No file selected
  if (!selectedFile) {
    return (
      <div style={{ padding: 20 }}>
        <h2>🔍 Dependency Lens</h2>
        <p>Select a file from Explorer or Graph</p>
      </div>
    )
  }

  // ✅ SAFE PATH HELPER
  const getName = (path) =>
    (path || "").split(/[/\\]/).pop()

  // ✅ FAN OUT (imports)
  const fanOut = selectedFile.imports || []

  // ✅ FAN IN (who uses this file)
  const fanIn = files.filter(f =>
    (f.imports || []).some(imp =>
      imp.includes(selectedFile.path)
    )
  )

  // 🧠 INSIGHTS
  const insights = []

  if (fanOut.length > 5)
    insights.push("⚠️ High coupling (too many imports)")

  if (fanIn.length === 0)
    insights.push("⚠️ Possibly unused file")

  if (fanIn.length > 3)
    insights.push("🔥 Core module (used in many places)")

  return (
    <div style={{ padding: 20 }}>
      <h2>🔍 Dependency Lens</h2>

      {/* MAIN VIEW */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 20
        }}
      >

        {/* LEFT → FAN IN */}
        <div style={{ width: "30%" }}>
          <h3>⬅️ Used By</h3>
          {fanIn.length === 0 ? (
            <p>No files use this</p>
          ) : (
            fanIn.map((f, i) => (
              <div key={f.path || i}>
                {getName(f.path)}
              </div>
            ))
          )}
        </div>

        {/* CENTER → SELECTED FILE */}
        <div
          style={{
            width: "30%",
            textAlign: "center",
            padding: 20,
            background: "#1f2937",
            color: "white",
            borderRadius: 10,
            fontWeight: "bold"
          }}
        >
          {getName(selectedFile.path)}
        </div>

        {/* RIGHT → FAN OUT */}
        <div style={{ width: "30%" }}>
          <h3>➡️ Imports</h3>
          {fanOut.length === 0 ? (
            <p>No imports</p>
          ) : (
            fanOut.map((imp, i) => (
              <div key={i}>
                {getName(imp)}
              </div>
            ))
          )}
        </div>

      </div>

      {/* INSIGHTS */}
      <div style={{ marginTop: 30 }}>
        <h3>🧠 Insights</h3>

        {insights.length === 0 ? (
          <p>No issues detected</p>
        ) : (
          insights.map((i, idx) => (
            <div key={idx}>{i}</div>
          ))
        )}
      </div>
    </div>
  )
}