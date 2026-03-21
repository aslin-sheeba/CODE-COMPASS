import { useProjectStore } from "../../state/projectStore"

function StatsBar() {

  const { files } = useProjectStore()

  const totalFiles = files.length

  const totalImports = files.reduce((acc, f) => acc + f.imports.length, 0)

  const avgImports = totalFiles
    ? (totalImports / totalFiles).toFixed(2)
    : 0

  // language breakdown
  const langCounts = files.reduce((acc, f) => {
    const m = f.path.match(/\.(\w+)$/)
    const ext = m ? m[1] : "other"
    acc[ext] = (acc[ext] || 0) + 1
    return acc
  }, {})

  const maxCount = Math.max(0, ...Object.values(langCounts))

  const highStressCount = files.filter(f => f.imports.length > 10).length

  // integrity score: simplistic heuristic (1 - normalized highStress fraction)
  const integrity = totalFiles ? Math.max(0, Math.round((1 - (highStressCount / totalFiles)) * 100)) : 100

  return (
    <div style={{
      marginTop:20,
      padding:20,
      background:"#111",
      color:"#fff",
      display:"flex",
      gap:40,
      alignItems: "flex-start"
    }}>
      <div>Total Files: {totalFiles}</div>
      <div>Total Imports: {totalImports}</div>
      <div>Avg Imports: {avgImports}</div>
      <div>High Stress: {highStressCount}</div>
      <div>Integrity: {integrity}%</div>

      <div style={{ minWidth: 200 }}>
        <div style={{ fontSize: 12, color: '#ccc', marginBottom: 6 }}>Language breakdown</div>
        {Object.keys(langCounts).map((k) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 80, fontSize: 12 }}>{k}</div>
            <div style={{ background: '#333', height: 10, width: 120 }}>
              <div style={{ background: '#0af', height: 10, width: `${(langCounts[k] / (maxCount || 1)) * 100}%` }} />
            </div>
            <div style={{ fontSize: 12, color: '#ddd', marginLeft: 6 }}>{langCounts[k]}</div>
          </div>
        ))}
      </div>

    </div>
  )
}

export default StatsBar
