import React from "react"
import ModuleGraph from "../components/ModuleGraph"
import { useProjectStore } from "../state/projectStore"
import { findCycles } from "../services/cycleService"
import { T } from "../theme"

// ── Helpers ──────────────────────────────────────────────────────────────────
const stressColor = s => s > 20 ? T.red : s > 10 ? T.orange : T.green
const extColor = p => ({ tsx:T.teal,ts:T.blue,jsx:T.teal,js:T.orange,css:"#8b5cf6",json:T.green }[(p||"").match(/\.(\w+)$/)?.[1]]||T.textHint)
const fileName  = p => (p||"").replace(/\\/g,"/").split("/").pop()
const isExt     = i => !i.startsWith(".") && !i.startsWith("/")

// ── Shared sub-components ────────────────────────────────────────────────────
const Label = ({ children }) => (
  <div style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.1em", color:T.textHint, fontFamily:"monospace", fontWeight:600, marginBottom:6 }}>
    {children}
  </div>
)

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.rMd, padding:"12px 16px", flex:1, borderTop:`2px solid ${color}` }}>
      <Label>{label}</Label>
      <div style={{ fontSize:22, fontWeight:700, color, lineHeight:1, fontFamily:"monospace" }}>{value}</div>
      {sub && <div style={{ fontSize:9, color:T.textHint, fontFamily:"monospace", marginTop:3 }}>{sub}</div>}
    </div>
  )
}

// ── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { color:T.green,  label:"Low stress",    desc:"≤ 10" },
    { color:T.orange, label:"Medium stress", desc:"11–20" },
    { color:T.red,    label:"High stress",   desc:"> 20" },
    { color:T.red,    label:"Cyclic edge",   desc:"circular" },
    { color:"#8b5cf6",label:"Unused node",   desc:"0 fan-in" },
  ]
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.rMd, padding:"10px 16px", display:"flex", gap:18, flexWrap:"wrap", alignItems:"center", flexShrink:0 }}>
      <Label>Legend</Label>
      {items.map(it => (
        <div key={it.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:it.color, flexShrink:0 }} />
          <span style={{ fontSize:10, color:T.text, fontFamily:"monospace" }}>{it.label}</span>
          <span style={{ fontSize:9, color:T.textHint, fontFamily:"monospace" }}>{it.desc}</span>
        </div>
      ))}
      <div style={{ marginLeft:"auto", fontSize:9, color:T.textHint, fontFamily:"monospace" }}>
        scroll to zoom · drag to pan · click node to inspect
      </div>
    </div>
  )
}

// ── Controls ─────────────────────────────────────────────────────────────────
function Controls({ showCycles, setShowCycles, showUnused, setShowUnused, onReset }) {
  const chip = (active, color, label, onClick) => (
    <button onClick={onClick} style={{ padding:"5px 12px", borderRadius:5, border:"1px solid", borderColor:active?`${color}55`:T.border, background:active?`${color}14`:"transparent", color:active?color:T.textHint, fontSize:10, fontFamily:"monospace", cursor:"pointer" }}>
      {active?"● ":"○ "}{label}
    </button>
  )
  return (
    <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", flexShrink:0 }}>
      <Label>Filters</Label>
      {chip(showCycles, T.red,    "Highlight Cycles", () => setShowCycles(v=>!v))}
      {chip(showUnused, "#8b5cf6","Show Unused",      () => setShowUnused(v=>!v))}
      <button onClick={onReset} style={{ padding:"5px 12px", borderRadius:5, border:`1px solid ${T.border}`, background:"transparent", color:T.textHint, fontSize:10, fontFamily:"monospace", cursor:"pointer", marginLeft:"auto" }}>
        ↺ Reset View
      </button>
    </div>
  )
}

// ── Node Detail Panel ─────────────────────────────────────────────────────────
function NodeDetailPanel({ file, files, onClose }) {
  if (!file) return null
  const meta    = file._meta || {}
  const score   = meta.stressScore || 0
  const color   = stressColor(score)
  const ec      = extColor(file.path)
  const ext     = file.path.match(/\.(\w+)$/)?.[1] || "?"
  const imports = file.imports || []
  const local   = imports.filter(i => !isExt(i))
  const external= imports.filter(isExt)
  const usedBy  = files.filter(f => f.path !== file.path && (f.imports||[]).some(imp => imp.includes(fileName(file.path).replace(/\.(tsx|ts|jsx|js)$/,""))))

  const insights = []
  if      (score > 20)       insights.push({ icon:"🔴", text:"Critical stress — refactoring priority",           color:T.red    })
  else if (score > 10)       insights.push({ icon:"🟡", text:"Moderate stress — monitor coupling",              color:T.orange })
  if (usedBy.length >= 3)    insights.push({ icon:"🔥", text:`Core module — ${usedBy.length} files depend on it`, color:T.blue })
  if (!usedBy.length && !["App.","main.","index."].some(x=>file.path.includes(x)))
                             insights.push({ icon:"👻", text:"Possibly unused — zero incoming imports",         color:"#8b5cf6" })
  if (imports.length > 5)    insights.push({ icon:"⚠️", text:`High fan-out — imports ${imports.length} modules`, color:T.orange })
  if (!insights.length)      insights.push({ icon:"✅", text:"Healthy module — no issues detected",             color:T.green  })

  const row = (items) => (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
      {items.map(m => (
        <div key={m.label} style={{ background:T.surfaceAlt, border:`1px solid ${T.border}`, borderRadius:T.r, padding:"7px 9px" }}>
          <div style={{ fontSize:9, color:T.textHint, fontFamily:"monospace", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{m.label}</div>
          <div style={{ fontSize:16, fontWeight:700, color:m.color, fontFamily:"monospace" }}>{m.value}</div>
        </div>
      ))}
    </div>
  )

  const listBox = (items, getLabel, tagColor, tagLabel, title) => items.length > 0 && (
    <div style={{ padding:"0 12px 12px" }}>
      <Label>{title} ({items.length})</Label>
      <div style={{ background:T.surfaceAlt, border:`1px solid ${T.border}`, borderRadius:T.r, overflow:"hidden" }}>
        {items.slice(0,8).map((it,i) => (
          <div key={i} style={{ padding:"5px 9px", borderBottom: i<Math.min(items.length,8)-1?`1px solid ${T.border}`:"none", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:8, width:20, flexShrink:0, color:tagColor, fontFamily:"monospace" }}>{tagLabel(it)}</span>
            <span style={{ fontSize:10, color:T.textSub, fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{getLabel(it)}</span>
          </div>
        ))}
        {items.length > 8 && <div style={{ padding:"4px 9px", fontSize:9, color:T.textHint, fontFamily:"monospace" }}>+{items.length-8} more</div>}
      </div>
    </div>
  )

  return (
    <div style={{ width:264, flexShrink:0, background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.rMd, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, background:T.surfaceAlt, display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        <div style={{ width:26,height:17,borderRadius:3,background:`${ec}18`,border:`1px solid ${ec}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontFamily:"monospace",fontWeight:700,color:ec,flexShrink:0 }}>{ext}</div>
        <div style={{ fontSize:11,fontWeight:700,color:T.text,fontFamily:"monospace",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{fileName(file.path)}</div>
        <button onClick={onClose} style={{ background:"none",border:"none",color:T.textHint,cursor:"pointer",fontSize:14,padding:0,flexShrink:0 }}>✕</button>
      </div>

      <div style={{ flex:1, overflowY:"auto" }}>
        {/* Stress bar */}
        <div style={{ padding:"12px 12px 8px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
            <Label>Stress Score</Label>
            <span style={{ fontSize:12,fontWeight:700,color,fontFamily:"monospace" }}>{score}</span>
          </div>
          <div style={{ height:5,background:T.surfaceAlt,borderRadius:3,overflow:"hidden" }}>
            <div style={{ height:"100%",borderRadius:3,width:`${Math.min((score/30)*100,100)}%`,background:color,transition:"width 0.4s ease" }} />
          </div>
        </div>

        {/* Metrics */}
        <div style={{ padding:"0 12px 10px" }}>
          {row([
            { label:"Fan-Out",  value:imports.length, color:"#8b5cf6" },
            { label:"Fan-In",   value:usedBy.length,  color:T.teal    },
            { label:"Local",    value:local.length,   color:T.orange  },
            { label:"External", value:external.length,color:T.green   },
            { label:"Lines",    value:file.lines||"—", color:T.text   },
            { label:"Incoming", value:meta.incoming||0,color:T.blue   },
          ])}
        </div>

        {/* Insights */}
        <div style={{ padding:"0 12px 10px" }}>
          <Label>Insights</Label>
          <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
            {insights.map((ins,i) => (
              <div key={i} style={{ padding:"7px 9px",borderRadius:T.r,background:T.surfaceAlt,border:`1px solid ${ins.color}22`,borderLeft:`3px solid ${ins.color}`,display:"flex",gap:7,alignItems:"flex-start" }}>
                <span style={{ fontSize:11,flexShrink:0 }}>{ins.icon}</span>
                <span style={{ fontSize:10,color:T.textSub,lineHeight:1.5 }}>{ins.text}</span>
              </div>
            ))}
          </div>
        </div>

        {listBox(imports, i=>i, isExt(imports[0]||".")?"#8b5cf6":T.teal, it=>isExt(it)?"pkg":"rel", "Imports")}
        {listBox(usedBy,  f=>fileName(f.path), T.green, ()=>"←", "Used By")}
      </div>
    </div>
  )
}

// ── Cycle Detector Panel ──────────────────────────────────────────────────────
function CycleDetectorPanel({ files, onHighlightCycle }) {
  const [open,    setOpen]    = React.useState(true)
  const [selCycle,setSelCycle]= React.useState(null)

  const cycles = React.useMemo(() => {
    if (!files.length) return []
    try { return findCycles(files) } catch { return [] }
  }, [files])

  const headerStyle = { padding:"10px 14px", borderBottom:`1px solid ${T.border}`, background:T.surfaceAlt, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }

  if (!open) return (
    <div onClick={()=>setOpen(true)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.rMd, padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", flexShrink:0 }}>
      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
        <span style={{ fontSize:13 }}>🔁</span>
        <span style={{ fontSize:12,fontWeight:700,color:T.text }}>Cycle Detector</span>
        {cycles.length > 0 && <span style={{ padding:"1px 8px",borderRadius:4,background:`${T.red}18`,color:T.red,fontSize:10,fontFamily:"monospace",fontWeight:700 }}>{cycles.length} found</span>}
      </div>
      <span style={{ color:T.textHint,fontSize:12 }}>▶</span>
    </div>
  )

  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.rMd, overflow:"hidden", flexShrink:0 }}>
      <div onClick={()=>setOpen(false)} style={headerStyle}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ fontSize:13 }}>🔁</span>
          <span style={{ fontSize:13,fontWeight:700,color:T.text }}>Cycle Detector</span>
          <span style={{ fontSize:10,color:T.textHint,fontFamily:"monospace" }}>circular dependency analysis</span>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          {cycles.length > 0
            ? <span style={{ padding:"2px 10px",borderRadius:4,background:`${T.red}18`,border:`1px solid ${T.red}33`,color:T.red,fontSize:10,fontFamily:"monospace",fontWeight:700 }}>{cycles.length} cycle{cycles.length!==1?"s":""} detected</span>
            : <span style={{ padding:"2px 10px",borderRadius:4,background:T.greenLight,border:`1px solid ${T.greenBorder}`,color:T.green,fontSize:10,fontFamily:"monospace",fontWeight:700 }}>✓ No cycles</span>
          }
          <span style={{ color:T.textHint,fontSize:11 }}>▼</span>
        </div>
      </div>

      <div style={{ padding:"12px 14px" }}>
        {cycles.length === 0 ? (
          <div style={{ padding:"16px 0",textAlign:"center",color:T.textHint,fontFamily:"monospace",fontSize:11 }}>
            🎉 No circular dependencies found
          </div>
        ) : (
          <>
            <div style={{ padding:"10px 12px",borderRadius:T.r,background:T.redLight,border:`1px solid ${T.redBorder}`,borderLeft:`3px solid ${T.red}`,marginBottom:12,fontSize:11,color:T.textSub,lineHeight:1.5 }}>
              ⚠️ Circular dependencies can cause unpredictable module loading, memory leaks, and hard-to-debug runtime errors.
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {cycles.map((cycle,i) => {
                const isSel = selCycle === i
                return (
                  <div key={i} onClick={() => { setSelCycle(isSel?null:i); onHighlightCycle(isSel?null:cycle) }}
                    style={{ padding:"10px 12px",borderRadius:T.r,background:isSel?T.redLight:T.surfaceAlt,border:`1px solid ${isSel?T.redBorder:T.border}`,cursor:"pointer",transition:"all 0.15s" }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <span style={{ fontSize:9,fontFamily:"monospace",color:T.red,fontWeight:700,padding:"1px 6px",borderRadius:3,background:`${T.red}18` }}>CYCLE {i+1}</span>
                        <span style={{ fontSize:9,color:T.textHint,fontFamily:"monospace" }}>{cycle.length} files</span>
                      </div>
                      {isSel && <span style={{ fontSize:9,color:T.red,fontFamily:"monospace" }}>highlighted ●</span>}
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:4,flexWrap:"wrap" }}>
                      {cycle.map(fileName).map((n,j,arr) => (
                        <React.Fragment key={j}>
                          <span style={{ fontSize:10,color:T.text,fontFamily:"monospace",padding:"1px 6px",borderRadius:3,background:T.border }}>{n}</span>
                          {j < arr.length-1 && <span style={{ fontSize:10,color:T.red }}>→</span>}
                        </React.Fragment>
                      ))}
                      <span style={{ fontSize:10,color:T.red }}>↩</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop:10,padding:"7px 10px",borderRadius:T.r,background:T.brandLight,border:`1px solid ${T.brandBorder}`,fontSize:10,color:T.textHint,fontFamily:"monospace" }}>
              💡 Click a cycle to highlight it in the graph above
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Architecture() {
  const { files, selectedFile } = useProjectStore()
  const [showCycles, setShowCycles] = React.useState(true)
  const [showUnused, setShowUnused] = React.useState(false)
  const [resetKey,   setResetKey]   = React.useState(0)
  const [activeCycle,setActiveCycle]= React.useState(null)

  const totalDeps    = files.reduce((a,f)=>a+(f.imports?.length||0),0)
  const highCoupling = files.filter(f=>(f._meta?.stressScore||0)>20).length
  const cleanMods    = files.filter(f=>(f._meta?.stressScore||0)<=6).length
  const unusedCount  = files.filter(f=>(f._meta?.incoming||0)===0&&!["main.","App.","index."].some(x=>f.path.includes(x))).length

  return (
    <div style={{ padding:16,background:T.bg,height:"100%",color:T.text,display:"flex",flexDirection:"column",gap:10,overflow:"auto",boxSizing:"border-box",fontFamily:"monospace" }}>

      <div style={{ flexShrink:0 }}>
        <div style={{ fontSize:16,fontWeight:700,color:T.text,marginBottom:2 }}>Module Architecture</div>
        <div style={{ fontSize:11,color:T.textHint }}>// interactive dependency graph — click any node to inspect</div>
      </div>

      <div style={{ display:"flex",gap:10,flexShrink:0 }}>
        <StatCard label="Total Modules"  value={files.length}  color={T.blue}   />
        <StatCard label="Dependencies"   value={totalDeps}     color="#8b5cf6"  />
        <StatCard label="High Coupling"  value={highCoupling}  color={T.red}    sub="stress > 20" />
        <StatCard label="Clean Modules"  value={cleanMods}     color={T.green}  sub="stress ≤ 6"  />
        <StatCard label="Unused Files"   value={unusedCount}   color={T.orange} sub="zero fan-in" />
      </div>

      <Legend />
      <Controls showCycles={showCycles} setShowCycles={setShowCycles} showUnused={showUnused} setShowUnused={setShowUnused} onReset={()=>{setResetKey(k=>k+1);setActiveCycle(null)}} />

      <div style={{ display:"flex",gap:10,overflow:"hidden",minHeight:460,flexShrink:0 }}>
        <div style={{ flex:1,background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:T.rMd,overflow:"hidden",display:"flex",flexDirection:"column" }}>
          <ModuleGraph key={resetKey} width={selectedFile?760:1060} height={460} activeCycle={activeCycle} />
        </div>
        {selectedFile && (
          <NodeDetailPanel file={selectedFile} files={files} onClose={()=>useProjectStore.getState().selectFile(null)} />
        )}
      </div>

      <CycleDetectorPanel files={files} onHighlightCycle={setActiveCycle} />
    </div>
  )
}
