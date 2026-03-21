import React from "react"
import { useProjectStore } from "../../state/projectStore"
import Prism from "prismjs"
import "prismjs/themes/prism.css"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-tsx"
import "prismjs/components/prism-css"
import "prismjs/components/prism-markup"
import "prismjs/components/prism-json"

function detectLangFromPath(path) {
  const m = path.match(/\.(\w+)$/)
  const ext = m ? m[1] : ""
  if (ext === "js") return "javascript"
  if (ext === "jsx") return "jsx"
  if (ext === "ts") return "typescript"
  if (ext === "tsx") return "tsx"
  if (ext === "css") return "css"
  if (ext === "html") return "markup"
  if (ext === "json") return "json"
  return "javascript"
}

function CodePreview() {

  const { selectedFile } = useProjectStore()

  if (!selectedFile) {
    return (
      <div style={{ marginLeft:20 }}>
        Select a file
      </div>
    )
  }

  const code = selectedFile.content || ""
  const lang = detectLangFromPath(selectedFile.path)
  const highlighted = Prism.highlight(code, Prism.languages[lang] || Prism.languages.javascript, lang)

  const meta = selectedFile._meta || {}

  return (

    <div style={{
      width:"60%",
      marginLeft:20,
      border:"1px solid #ccc",
      padding:10
    }}>

      <h3 style={{ marginBottom: 6 }}>{selectedFile.path}</h3>

      <div style={{ marginBottom: 8, fontSize: 13 }}>
        <strong>Lines:</strong> {selectedFile.lines} — <strong>Imports:</strong> {meta.importCount || (selectedFile.imports||[]).length} — <strong>Stress:</strong> {meta.stressScore ?? "—"}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, marginBottom: 6 }}>Imports</div>
        <ul>
          {(selectedFile.imports||[]).map((imp,i)=>(
            <li key={i}>{imp}</li>
          ))}
        </ul>
      </div>

      <div>
        <pre style={{ maxHeight: 500, overflow: 'auto', background: '#f5f5f5', padding: 12 }}>
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>

    </div>

  )
}

export default CodePreview