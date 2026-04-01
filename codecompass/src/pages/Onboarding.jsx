import React from "react"
import { T } from "../theme"

const TRACKS = [
  { id:"setup", label:"Environment Setup", icon:"⚡", color: T.teal, desc:"Get your machine ready", items:[
    { id:"clone",    text:"Clone the repository",                     est:"2 min",  note:"git clone https://github.com/your-org/codecompass.git" },
    { id:"install",  text:"Run npm install",                          est:"5 min",  note:"Run in both /app and /server" },
    { id:"env",      text:"Configure .env with keys",                 est:"3 min",  note:"Copy .env.example to .env" },
    { id:"devrun",   text:"Start dev server with npm start",          est:"1 min",  note:"Runs Vite + Electron concurrently" },
    { id:"electron", text:"Confirm Electron window opens",            est:"1 min",  note:"Should show CodeCompass window" },
  ]},
  { id:"codebase", label:"Codebase Orientation", icon:"🗺", color: T.blue, desc:"Understand project structure", items:[
    { id:"structure", text:"Review top-level folder structure",       est:"10 min", note:"Key: /app (React+Electron), /electron (IPC)" },
    { id:"store",     text:"Read state/projectStore.js",              est:"10 min", note:"Zustand store — holds files[], selectedFile" },
    { id:"ipc",       text:"Trace Electron IPC flow",                 est:"15 min", note:"React → preload.js → ipcMain.handle" },
    { id:"scanner",   text:"Read scanProject.js",                     est:"10 min", note:"Walks directory tree, extracts imports" },
    { id:"pages",     text:"Skim each page component",                est:"20 min", note:"Start with Dashboard.jsx" },
  ]},
  { id:"architecture", label:"Architecture Deep Dive", icon:"🏗", color: T.orange, desc:"Understand key design decisions", items:[
    { id:"graph",  text:"Run app and import a real project",          est:"5 min",  note:"Try importing the CodeCompass repo itself" },
    { id:"stress", text:"Identify the 3 highest stress files",        est:"10 min", note:"Sort FileExplorer by stress score" },
    { id:"cycles", text:"Find circular dependency cycles",            est:"10 min", note:"Red edges in ModuleGraph = cycles" },
    { id:"unused", text:"Review the unused files panel",              est:"5 min",  note:"Zero fan-in files may be dead code" },
  ]},
  { id:"contribute", label:"First Contribution", icon:"🚀", color: T.brand, desc:"Make your first commit", items:[
    { id:"issue",  text:"Pick a small issue or bug from the backlog", est:"10 min", note:"Look for 'good first issue' label" },
    { id:"branch", text:"Create a feature branch",                    est:"2 min",  note:"git checkout -b feat/your-name-fix" },
    { id:"code",   text:"Make your change",                           est:"varies", note:"Keep it small and focused" },
    { id:"pr",     text:"Open a pull request",                        est:"5 min",  note:"Link to the issue in your PR description" },
  ]},
]

function exportMarkdown(done) {
  const lines = ["# Developer Onboarding Checklist\n"]
  for (const track of TRACKS) {
    lines.push(`## ${track.icon} ${track.label}\n`)
    for (const item of track.items) {
      const checked = done.has(item.id)
      lines.push(`- [${checked?"x":" "}] ${item.text} *(${item.est})*`)
      if (item.note) lines.push(`  > ${item.note}`)
    }
    lines.push("")
  }
  const blob = new Blob([lines.join("\n")], { type:"text/markdown" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href = url; a.download = "onboarding.md"; a.click()
  URL.revokeObjectURL(url)
}

export default function Onboarding() {
  const [done,    setDone]    = React.useState(() => new Set())
  const [expanded,setExpanded]= React.useState(new Set(["setup"]))
  const totalItems = TRACKS.reduce((s,t)=>s+t.items.length,0)
  const doneCount  = done.size
  const pct = Math.round(doneCount / totalItems * 100)

  const toggle = id => setDone(d => { const n=new Set(d); n.has(id)?n.delete(id):n.add(id); return n })
  const toggleTrack = id => setExpanded(e => { const n=new Set(e); n.has(id)?n.delete(id):n.add(id); return n })

  return (
    <div style={{ padding:24, background: T.bg, minHeight:"100%", fontFamily:"monospace" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color: T.text, marginBottom:2 }}>developer onboarding</div>
          <div style={{ fontSize:11, color: T.textHint }}>{doneCount} of {totalItems} tasks complete</div>
        </div>
        <button onClick={()=>exportMarkdown(done)} style={{ padding:"6px 14px", borderRadius: T.r, border:`1px solid ${T.border}`, background: T.surface, color: T.textSub, fontSize:11, cursor:"pointer", fontFamily:"monospace" }}>
          export .md
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius: T.rMd, padding:"14px 16px", marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ fontSize:11, color: T.textSub }}>overall progress</span>
          <span style={{ fontSize:11, fontWeight:700, color: T.brand }}>{pct}%</span>
        </div>
        <div style={{ height:6, background: T.surfaceAlt, borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background: T.brand, borderRadius:3, transition:"width 0.4s ease" }} />
        </div>
        <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
          {TRACKS.map(t => {
            const cnt = t.items.filter(i=>done.has(i.id)).length
            return (
              <span key={t.id} style={{ fontSize:10, color: cnt===t.items.length?T.green:T.textHint }}>
                {t.icon} {cnt}/{t.items.length}
              </span>
            )
          })}
        </div>
      </div>

      {/* Tracks */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {TRACKS.map(track => {
          const isOpen   = expanded.has(track.id)
          const trackDone = track.items.filter(i=>done.has(i.id)).length
          const allDone   = trackDone === track.items.length

          return (
            <div key={track.id} style={{ background: T.surface, border:`1px solid ${allDone?track.color+"60":T.border}`, borderRadius: T.rMd, overflow:"hidden" }}>
              {/* Track header */}
              <div
                onClick={()=>toggleTrack(track.id)}
                style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:10, cursor:"pointer", background: isOpen?T.surfaceAlt:T.surface, borderBottom: isOpen?`1px solid ${T.border}`:"none" }}
              >
                <span style={{ fontSize:16 }}>{track.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12.5, fontWeight:600, color: T.text }}>{track.label}</div>
                  <div style={{ fontSize:10.5, color: T.textHint, marginTop:1 }}>{track.desc}</div>
                </div>
                <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, background: allDone?T.greenLight:T.surfaceAlt, border:`1px solid ${allDone?T.greenBorder:T.border}`, color: allDone?T.green:T.textHint }}>
                  {trackDone}/{track.items.length}
                </span>
                <span style={{ fontSize:11, color: T.textHint }}>{isOpen?"▾":"▸"}</span>
              </div>

              {/* Items */}
              {isOpen && (
                <div style={{ padding:"6px 0" }}>
                  {track.items.map(item => {
                    const isDone = done.has(item.id)
                    return (
                      <div key={item.id} onClick={()=>toggle(item.id)}
                        style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 16px", cursor:"pointer", background:"transparent", transition:"background 0.1s", borderBottom:`1px solid ${T.border}` }}
                        onMouseEnter={e=>e.currentTarget.style.background=T.surfaceAlt}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                      >
                        {/* Checkbox */}
                        <div style={{ width:16, height:16, borderRadius:4, border:`1.5px solid ${isDone?T.brand:T.border}`, background: isDone?T.brand:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                          {isDone && <span style={{ fontSize:9, color:"#fff", fontWeight:700 }}>✓</span>}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, color: isDone?T.textHint:T.text, textDecoration: isDone?"line-through":"none", marginBottom:3 }}>{item.text}</div>
                          {item.note && <div style={{ fontSize:10.5, color: T.textHint, lineHeight:1.5 }}>{item.note}</div>}
                        </div>
                        <span style={{ fontSize:10, color: T.textHint, flexShrink:0, marginTop:2 }}>{item.est}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}