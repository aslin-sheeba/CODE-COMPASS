import React from "react"
import { search } from "../services/searchService"
import { useProjectStore } from "../state/projectStore"

export default function CodeSearch() {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState([])

  const { files, setHighlightedFile, selectFile } = useProjectStore()

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) setResults(search(query))
      else setResults([])
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div style={{ width: "100%", marginTop: 20 }}>
      <div style={{ marginBottom: 8 }}>
        <input
          placeholder="Search files, imports, content..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
      </div>

      <div>
        {results.map((r, i) => {
          const file = files.find(f => f.path === r.path)
          return (
            <div
              key={i}
              style={{ padding: 8, borderBottom: "1px solid #eee", cursor: file ? "pointer" : "default" }}
              onClick={() => {
                if (!file) return
                selectFile(file)
                setHighlightedFile(file)
              }}
            >
              <div style={{ fontSize: 12, color: "#333" }}>{r.path}</div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {r.line ? `Line ${r.line}: ` : ""}
                {r.snippet}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
