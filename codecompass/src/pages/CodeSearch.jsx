import React from "react"
import { useProjectStore } from "../state/projectStore"
import { search } from "../services/searchService"
import CodeEditor from "../components/CodeEditor"
import { T } from "../theme"

export default function CodeSearch() {
  const { project, files } = useProjectStore()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [results, setResults] = React.useState([])
  const [selectedResult, setSelectedResult] = React.useState(null)
  const [editorFile, setEditorFile] = React.useState(null)

  // Perform search as user types
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    // Search across all types (functions, files, content)
    const allResults = search(searchQuery, "all")
    setResults(allResults)
  }, [searchQuery])

  const handleOpenFile = (result) => {
    const file = files.find(f => f.path === result.path)
    if (file) {
      const fileWithPath = {
        ...file,
        savePath: file.realPath || file.path
      }
      setEditorFile(fileWithPath)
      setSelectedResult(result)
    }
  }

  const handleCloseEditor = () => {
    setEditorFile(null)
  }

  const handleSaveFile = (filePath, newContent) => {
    // Update reflected in original file via IPC
  }

  if (!project) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: T.textHint }}>
        <div style={{ fontSize: 30, marginBottom: 14 }}>🔍</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.textSub, marginBottom: 8 }}>
          Import a project to search
        </div>
        <div style={{ fontSize: 12, fontFamily: "monospace", lineHeight: 1.7 }}>
          Use the project explorer to load your codebase
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 0 }}>
      {/* Search Bar */}
      <div style={{
        padding: "16px 20px",
        borderBottom: `1px solid ${T.border}`,
        background: T.surface
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, color: T.textHint }}>🔍</span>
          <input
            type="text"
            placeholder="search files, symbols, content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: `1px solid ${T.border}`,
              borderRadius: T.r,
              fontFamily: "monospace",
              fontSize: 13,
              backgroundColor: T.codeBg,
              color: T.text,
              outline: "none"
            }}
          />
          <span style={{ fontSize: 10, color: T.textHint, fontFamily: "monospace" }}>
            ⌘K
          </span>
        </div>
      </div>

      {/* Results Area */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {searchQuery.trim() === "" ? (
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            color: T.textHint,
            gap: 16
          }}>
            <div style={{ fontSize: 40 }}>🔎</div>
            <div style={{ fontSize: 13, fontFamily: "monospace", textAlign: "center" }}>
              type to search across all files<br/>
              <span style={{ fontSize: 11, color: T.textHint }}>press ⌘K from anywhere to focus</span>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.textHint,
            fontSize: 12,
            fontFamily: "monospace"
          }}>
            No results found
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Group results by file */}
            {Object.entries(
              results.reduce((acc, result) => {
                const fileName = result.fileName
                if (!acc[fileName]) acc[fileName] = []
                acc[fileName].push(result)
                return acc
              }, {})
            ).map(([fileName, fileResults]) => (
              <div key={fileName} style={{ borderBottom: `1px solid ${T.border}` }}>
                {/* File Header */}
                <div
                  onClick={() => handleOpenFile(fileResults[0])}
                  style={{
                    padding: "10px 16px",
                    background: T.surfaceAlt,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 600,
                    fontSize: 12,
                    fontFamily: "monospace",
                    color: T.text,
                    transition: "background 0.15s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = T.surface}
                  onMouseLeave={(e) => e.currentTarget.style.background = T.surfaceAlt}
                >
                  <span style={{ color: T.brandBorder }}>📄</span>
                  {fileName}
                  <span style={{ marginLeft: "auto", fontSize: 10, color: T.textHint }}>
                    {fileResults.length} match{fileResults.length !== 1 ? "es" : ""}
                  </span>
                </div>

                {/* Results under this file */}
                {fileResults.map((result, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleOpenFile(result)}
                    style={{
                      padding: "10px 16px",
                      paddingLeft: "32px",
                      cursor: "pointer",
                      background: selectedResult === result ? T.brandLight : "transparent",
                      borderLeft: selectedResult === result ? `2px solid ${T.brand}` : "2px solid transparent",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 11,
                      fontFamily: "monospace"
                    }}
                    onMouseEnter={(e) => {
                      if (selectedResult !== result) e.currentTarget.style.background = T.surfaceAlt
                    }}
                    onMouseLeave={(e) => {
                      if (selectedResult !== result) e.currentTarget.style.background = "transparent"
                    }}
                  >
                    {/* Type Icon */}
                    <span style={{
                      width: 16,
                      flexShrink: 0,
                      color: {
                        function: T.blue,
                        filename: T.teal,
                        import: T.orange,
                        content: T.pink
                      }[result.type] || T.textHint
                    }}>
                      {result.type === "function" ? "ƒ" : result.type === "filename" ? "📄" : result.type === "import" ? "📦" : "💬"}
                    </span>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: {
                          function: T.blue,
                          filename: T.teal,
                          import: T.orange,
                          content: T.pink
                        }[result.type] || T.text,
                        fontWeight: result.type === "function" ? 600 : 400
                      }}>
                        {result.snippet}
                      </div>
                      {result.line && (
                        <div style={{ fontSize: 9, color: T.textHint, marginTop: 2 }}>
                          Line {result.line}
                        </div>
                      )}
                    </div>

                    {/* Edit Badge */}
                    <div style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      background: T.brandLight,
                      color: T.brand,
                      borderRadius: 3,
                      flexShrink: 0
                    }}>
                      Edit
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Code Editor Modal */}
      {editorFile && (
        <CodeEditor
          file={editorFile}
          onClose={handleCloseEditor}
          onSave={handleSaveFile}
        />
      )}
    </div>
  )
}