import React from "react"
import { useProjectStore } from "../../state/projectStore"

function FileExplorer() {

  const { files, selectFile } = useProjectStore()
  const [filter, setFilter] = React.useState("")
  const [lang, setLang] = React.useState("all")
  const [stressOnly, setStressOnly] = React.useState(false)

  const LANGS = Array.from(new Set(files.map(f => {
    const m = f.path.match(/\.(\w+)$/)
    return m ? m[1] : null
  }).filter(Boolean)))

  const thresholdHigh = 15

  const visible = files.filter((f) => {
    if (lang !== "all") {
      if (!f.path.endsWith(`.${lang}`)) return false
    }
    const stressScore = (f._meta && f._meta.stressScore) || 0
    if (stressOnly && (stressScore <= thresholdHigh)) return false
    if (filter && !f.path.toLowerCase().includes(filter.toLowerCase()) && !(f.imports||[]).join(" ").toLowerCase().includes(filter.toLowerCase())) return false
    return true
  })

  return (

    <div style={{
      width:"40%",
      height:"600px",
      overflow:"auto",
      border:"1px solid #ccc",
      padding:10
    }}>

      <div style={{ marginBottom: 8 }}>
        <input
          placeholder="Filter files or imports..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: "60%", padding: 6, marginRight: 8 }}
        />
        <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ padding: 6, marginRight: 8 }}>
          <option value="all">All</option>
          {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <label style={{ fontSize: 12 }}>
          <input type="checkbox" checked={stressOnly} onChange={(e)=>setStressOnly(e.target.checked)} /> High stress
        </label>
      </div>

      {visible.map((file) => {
        const importCount = file.imports?.length || 0;

        let color = "#22c55e"; // green
        if (importCount > 10) color = "#ef4444"; // red
        else if (importCount > 5) color = "#f59e0b"; // yellow

        return (
          <div
            key={file.path}
            onClick={() => selectFile(file)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px",
              cursor: "pointer",
              borderBottom: "1px solid #eee",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {file.path}
            </span>

            <span
              style={{
                background: color,
                color: "#fff",
                borderRadius: "12px",
                padding: "2px 8px",
                fontSize: "12px",
              }}
            >
              {importCount} imports
            </span>
          </div>
        );
      })}

    </div>

  )
}

export default FileExplorer