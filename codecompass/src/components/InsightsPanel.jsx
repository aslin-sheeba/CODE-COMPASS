import React from "react"
import { useProjectStore } from "../state/projectStore"

export default function InsightsPanel() {
  const { files, selectedFile } = useProjectStore()

  if (!selectedFile) {
    return (
      <div style={{ padding: 10 }}>
        <h3>🧠 Insights</h3>
        <p>Select a file to see details</p>
      </div>
    )
  }

  const imports = selectedFile.imports || []

  // 🔁 Find "Used By" (reverse dependencies)
  const usedBy = files.filter(f =>
    (f.imports || []).includes(selectedFile.path)
  )

  // 🧠 Depth calculation
  const getDepth = (file, visited = new Set()) => {
    if (!file || visited.has(file.path)) return 0
    visited.add(file.path)

    let maxDepth = 0
    file.imports.forEach(imp => {
      const next = files.find(f => f.path === imp)
      const depth = 1 + getDepth(next, visited)
      if (depth > maxDepth) maxDepth = depth
    })

    return maxDepth
  }

  const depth = getDepth(selectedFile)

  // ⚠️ Metrics (may be precomputed)
  const metrics = selectedFile.metrics || {}

  return (
    <div style={{
      width: 250,
      padding: 12,
      borderLeft: "1px solid #ddd",
      background: "#fff"
    }}>
      <h3>🧠 Insights</h3>

      <div><strong>File:</strong> {selectedFile.path.split("/").pop()}</div>
      <div>📥 Fan-Out: {metrics.fanOut || 0}</div>
      <div>📤 Fan-In: {metrics.fanIn || 0}</div>
      <div>🧠 Depth: {metrics.depth || 0}</div>
      <div>🔥 Risk Score: {metrics.risk || 0}</div>

      <hr />

      <div>
        <strong>Imports:</strong>
        <ul>
          {imports.map((imp, i) => (
            <li key={i}>{imp.split("/").pop()}</li>
          ))}
        </ul>
      </div>

      <div>
        <strong>Used By:</strong>
        <ul>
          {usedBy.map((f, i) => (
            <li key={i}>{f.path.split("/").pop()}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

