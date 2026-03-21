import React from "react"
import { useProjectStore } from "../state/projectStore"

export default function GraphSearch() {
  const { files, setHighlightedFile } = useProjectStore()

  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState([])

  React.useEffect(() => {
    if (!query) {
      setResults([])
      return
    }

    const filtered = files.filter(f =>
      f.path.toLowerCase().includes(query.toLowerCase())
    )

    setResults(filtered.slice(0, 8))
  }, [query, files])

  return (
    <div style={{ position: "relative" }}>

      <input
        placeholder="🔎 Search in graph..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "100%",
          padding: 8,
          border: "1px solid #ddd"
        }}
      />

      {results.length > 0 && (
        <div style={{
          position: "absolute",
          background: "#fff",
          border: "1px solid #ddd",
          width: "100%",
          zIndex: 10,
          maxHeight: 200,
          overflowY: "auto"
        }}>
          {results.map((f, i) => (
            <div
              key={i}
              style={{
                padding: 6,
                cursor: "pointer"
              }}
              onClick={() => {
                setHighlightedFile(f)
                setQuery("")
                setResults([])
              }}
            >
              {f.path.split("/").pop()}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
