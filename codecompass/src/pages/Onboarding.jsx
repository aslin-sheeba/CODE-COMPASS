import React from "react"
import { useProjectStore } from "../state/projectStore"
import { T } from "../theme"

const MOCK_STATS = { totalCommits:142, contributors:3, thisWeek:12, filesChanged:38, additions:1204, deletions:387, activeBranch:"main", lastCommit:"2h ago" }
const MOCK_COMMITS = [
  { hash:"a3f8c1d", message:"feat: add dependency scanner worker",    author:"Aslin", email:"aslin@dev.com", date:"2h ago",  branch:"main",        additions:84,  deletions:12, filesChanged:3 },
  { hash:"b91e204", message:"fix: remove duplicate testScanner fn",   author:"Aslin", email:"aslin@dev.com", date:"4h ago",  branch:"main",        additions:0,   deletions:18, filesChanged:1 },
  { hash:"c45d831", message:"refactor: consolidate layout components", author:"Dev",   email:"dev@team.com",  date:"1d ago",  branch:"main",        additions:42,  deletions:96, filesChanged:5 },
  { hash:"e72b559", message:"feat: wire api.ts to backend routes",    author:"Aslin", email:"aslin@dev.com", date:"1d ago",  branch:"feature/api", additions:31,  deletions:4,  filesChanged:2 },
  { hash:"f18a340", message:"chore: MongoDB connection retry",        author:"Dev",   email:"dev@team.com",  date:"2d ago",  branch:"main",        additions:22,  deletions:8,  filesChanged:1 },
]
const MOCK_CONTRIBUTORS = [
  { name:"Aslin", commits:78, additions:853, deletions:40,  pct:55 },
  { name:"Dev",   commits:48, additions:280, deletions:310, pct:34 },
  { name:"Sam",   commits:16, additions:71,  deletions:37,  pct:11 },
]
const MOCK_CHURN = [
  { file:"src/components/ModuleGraph.jsx", additions:312, deletions:0,  commits:4 },
  { file:"src/state/projectStore.js",      additions:98,  deletions:14, commits:3 },
  { file:"src/pages/Dashboard.jsx",        additions:84,  deletions:30, commits:5 },
]
function generateHeatmap() {
  const cells=[]
  for(let i=0;i<26*7;i++){const r=Math.random();let c=0;if(r>.65)c=Math.floor(Math.random()*2)+1;if(r>.82)c=Math.floor(Math.random()*3)+2;if(r>.94)c=Math.floor(Math.random()*4)+4;cells.push(c)}
  return cells
}
const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

function getHeatColor(c) {
  if(c===0) return T.surfaceAlt
  if(c<=1)  return T.greenLight
  if(c<=3)  return T.green
  return T.brand
}
function getInitials(n) { return (n||"?").split(" ").map(x=>x[0]).join("").toUpperCase().slice(0,2) }
function getAuthorColor(n) {
  const cols=[T.brand,T.blue,T.orange,T.green,T.red]
  let h=0; for(let i=0;i<(n||"").length;i++) h+=n.charCodeAt(i)
  return cols[h%cols.length]
}

function SectionTitle({ children }) {
  return <div style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", color: T.textHint, fontWeight:600, marginBottom:10 }}>{children}</div>
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius: T.rMd, padding:"12px 16px", flex:1, borderTop:`2px solid ${color}` }}>
      <div style={{ fontSize:10, color: T.textHint, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color, fontFamily:"monospace" }}>{value}</div>
    </div>
  )
}

function CommitPushBar({ projectPath, activeBranch }) {
  const [msg,   setMsg]   = React.useState("")
  const [push,  setPush]  = React.useState(true)
  const [status,setStatus]= React.useState(null)
  const [stMsg, setStMsg] = React.useState("")
  const [gitSt, setGitSt] = React.useState(null)

  React.useEffect(() => {
    if (!projectPath || !window.electronAPI?.getGitStatus) return
    window.electronAPI.getGitStatus(projectPath).then(s => { if (!s?.error) setGitSt(s) }).catch(()=>{})
  }, [projectPath])

  const changed = gitSt ? (gitSt.modified?.length||0)+(gitSt.added?.length||0)+(gitSt.deleted?.length||0) : 0

  const handle = async () => {
    if (!msg.trim()) { setStMsg("enter a commit message"); setStatus("error"); return }
    if (!window.electronAPI?.gitCommitPush) { setStMsg("git IPC not available — run as Electron app"); setStatus("error"); return }
    setStatus("working"); setStMsg(push ? "staging, committing & pushing…" : "staging & committing…")
    try {
      const r = await window.electronAPI.gitCommitPush(projectPath, msg.trim(), push)
      if (r?.error) { setStatus("error"); setStMsg(r.error) }
      else { setStatus("success"); setStMsg(push?"committed & pushed!":"committed!"); setMsg("") }
    } catch(e) { setStatus("error"); setStMsg(e.message||"failed") }
  }

  const openVSCode = async () => {
    if (!window.electronAPI?.openInVSCode) return
    await window.electronAPI.openInVSCode(projectPath)
  }

  const stColor = { working: T.orange, success: T.green, error: T.red }

  return (
    <div style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius: T.rMd, overflow:"hidden", marginBottom:20 }}>
      <div style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}`, background: T.surfaceAlt, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ padding:"3px 10px", borderRadius:20, background: T.greenLight, border:`1px solid ${T.greenBorder}`, color: T.green, fontSize:11, fontFamily:"monospace", fontWeight:500, display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background: T.green, display:"inline-block" }} />
            {activeBranch||"main"}
          </span>
          {gitSt && (
            <span style={{ fontSize:11, color: changed>0?T.orange:T.textHint, fontFamily:"monospace" }}>
              {changed>0?`${changed} changed`:"clean"}
            </span>
          )}
        </div>
        <button onClick={openVSCode} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px", background: T.surface, border:`1px solid ${T.border}`, borderRadius: T.r, color: T.textSub, fontSize:11, cursor:"pointer", fontFamily:"monospace" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 19.883V4.017a1.5 1.5 0 0 0-.85-1.43zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/></svg>
          VS Code
        </button>
      </div>
      <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
        {gitSt && changed>0 && (
          <div style={{ fontSize:10.5, color: T.orange, fontFamily:"monospace", background: T.orangeLight, border:`1px solid ${T.orangeBorder}`, borderRadius: T.r, padding:"6px 10px" }}>
            {[...gitSt.modified,...gitSt.added,...gitSt.deleted].slice(0,3).map(f=><div key={f}>• {f}</div>)}
            {changed>3&&<div>…+{changed-3} more</div>}
          </div>
        )}
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}
            placeholder='commit message e.g. "feat: add login"'
            style={{ flex:1, padding:"7px 12px", background: T.bg, border:`1px solid ${T.border}`, borderRadius: T.r, color: T.text, fontFamily:"monospace", fontSize:11.5, outline:"none" }}
            onFocus={e=>e.target.style.borderColor=T.brand} onBlur={e=>e.target.style.borderColor=T.border}
          />
          <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color: T.textSub, cursor:"pointer", flexShrink:0 }}>
            <div onClick={()=>setPush(p=>!p)} style={{ width:30, height:16, borderRadius:8, background: push?T.brandLight:T.surfaceAlt, border:`1px solid ${push?T.brandBorder:T.border}`, position:"relative", cursor:"pointer", transition:"all 0.15s" }}>
              <div style={{ position:"absolute", top:2, left: push?15:2, width:10, height:10, borderRadius:"50%", background: push?T.brand:T.textHint, transition:"left 0.15s" }} />
            </div>
            push
          </label>
          <button onClick={handle} disabled={status==="working"||!msg.trim()}
            style={{ padding:"7px 16px", borderRadius: T.r, border:"none", background: msg.trim()&&status!=="working"?T.brand: T.border, color: msg.trim()&&status!=="working"?"#fff":T.textHint, cursor: msg.trim()&&status!=="working"?"pointer":"not-allowed", fontSize:11.5, fontWeight:600, fontFamily:"monospace", flexShrink:0 }}>
            {status==="working"?"…":push?"commit & push":"commit"}
          </button>
        </div>
        {status && stMsg && (
          <div style={{ padding:"5px 10px", borderRadius: T.r, fontSize:11, fontFamily:"monospace", background: status==="success"?T.greenLight:status==="error"?T.redLight:T.orangeLight, border:`1px solid ${status==="success"?T.greenBorder:status==="error"?T.redBorder:T.orangeBorder}`, color: stColor[status]||T.text }}>
            {stMsg}
          </div>
        )}
      </div>
    </div>
  )
}

function Heatmap({ data }) {
  const [hov,setHov]=React.useState(null)
  return (
    <div style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius: T.rMd, overflow:"hidden", marginBottom:20 }}>
      <div style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}` }}>
        <SectionTitle>contribution heatmap — last 26 weeks</SectionTitle>
      </div>
      <div style={{ padding:"14px 16px" }}>
        <div style={{ display:"flex", gap:5 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:3, paddingTop:1 }}>
            {DAYS.map((d,i)=><div key={d} style={{ height:12, fontSize:8, color: i%2===0?T.textHint:"transparent", lineHeight:"12px", width:22, textAlign:"right" }}>{d}</div>)}
          </div>
          <div style={{ display:"grid", gridTemplateRows:"repeat(7,12px)", gridTemplateColumns:"repeat(26,12px)", gridAutoFlow:"column", gap:3 }}>
            {data.map((c,i)=>(
              <div key={i} onMouseEnter={()=>setHov({i,c})} onMouseLeave={()=>setHov(null)}
                style={{ width:12, height:12, borderRadius:2, background: getHeatColor(c), cursor:"pointer", transform: hov?.i===i?"scale(1.3)":"scale(1)", transition:"transform 0.1s", outline: hov?.i===i?`1px solid ${T.brand}`:"none" }} />
            ))}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:10, fontSize:9, color: T.textHint }}>
          <span>less</span>
          {[0,1,3,5,7].map(n=><div key={n} style={{ width:11, height:11, borderRadius:2, background: getHeatColor(n) }} />)}
          <span>more</span>
          {hov&&<span style={{ marginLeft:10, color: T.brand }}>{hov.c} commit{hov.c!==1?"s":""}</span>}
        </div>
      </div>
    </div>
  )
}

function CommitRow({ c, expanded, onToggle }) {
  const [hov,setHov]=React.useState(false)
  const color=getAuthorColor(c.author)
  const td = { padding:"9px 12px", borderBottom:`1px solid ${T.border}`, fontSize:12, color: T.text }
  return (
    <>
      <tr onClick={onToggle} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{ cursor:"pointer", background: hov ? T.surfaceAlt : "transparent" }}>
        <td style={td}><span style={{ fontFamily:"monospace", fontSize:10.5, color: T.brand, background: T.brandLight, padding:"2px 7px", borderRadius:4 }}>{c.hash}</span></td>
        <td style={{ ...td, maxWidth:300 }}><div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.message}</div></td>
        <td style={td}><div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:22, height:22, borderRadius:6, background:`${color}22`, border:`1px solid ${color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:700, color, fontFamily:"monospace" }}>{getInitials(c.author)}</div>
          <span style={{ fontSize:11, color: T.textSub }}>{c.author}</span>
        </div></td>
        <td style={td}><span style={{ fontSize:10, padding:"2px 7px", borderRadius:4, fontFamily:"monospace", background: c.branch==="main"?T.greenLight:T.blueLight, color: c.branch==="main"?T.green:T.blue }}>{c.branch}</span></td>
        <td style={td}><span style={{ color: T.green, fontFamily:"monospace", fontSize:10.5 }}>+{c.additions}</span> <span style={{ color: T.red, fontFamily:"monospace", fontSize:10.5 }}>-{c.deletions}</span></td>
        <td style={{ ...td, color: T.textHint, fontSize:10.5 }}>{c.date}</td>
      </tr>
      {expanded&&(
        <tr><td colSpan={6} style={{ padding:"6px 12px 12px", background: T.surfaceAlt, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", gap:24, fontFamily:"monospace", fontSize:10.5 }}>
            <div><div style={{ color: T.textHint, fontSize:9, marginBottom:3 }}>FULL HASH</div><div style={{ color: T.brand }}>{c.fullHash||c.hash}</div></div>
            <div><div style={{ color: T.textHint, fontSize:9, marginBottom:3 }}>EMAIL</div><div style={{ color: T.textSub }}>{c.email}</div></div>
            <div><div style={{ color: T.textHint, fontSize:9, marginBottom:3 }}>FILES</div><div style={{ color: T.orange }}>{c.filesChanged} file{c.filesChanged!==1?"s":""}</div></div>
            <div><div style={{ color: T.textHint, fontSize:9, marginBottom:3 }}>NET</div><div style={{ color: c.additions-c.deletions>=0?T.green:T.red }}>{c.additions-c.deletions>=0?"+":""}{c.additions-c.deletions}</div></div>
          </div>
        </td></tr>
      )}
    </>
  )
}

export default function GitActivity() {
  const { files } = useProjectStore()
  const [gitData, setGitData] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [error,   setError]   = React.useState(null)
  const [heatmap, setHeatmap] = React.useState(generateHeatmap)
  const [expanded,setExpanded]= React.useState(null)
  const [search,  setSearch]  = React.useState("")
  const [filter,  setFilter]  = React.useState("all")

  const projectPath = React.useMemo(() => {
    if (!files?.length) return null
    const first = (files[0]?.path||"").replace(/\\/g,"/")
    return first.split("/").slice(0,-2).join("/")||first
  }, [files])

  React.useEffect(() => {
    if (!projectPath||!window.electronAPI?.getGitData) return
    setLoading(true); setError(null)
    window.electronAPI.getGitData(projectPath)
      .then(d => { if(d){setGitData(d);if(d.heatmap)setHeatmap(d.heatmap)}else setError("No git repo found.") })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [projectPath])

  const stats        = gitData?.stats        || MOCK_STATS
  const commits      = gitData?.commits      || MOCK_COMMITS
  const contributors = gitData?.contributors || MOCK_CONTRIBUTORS
  const churnFiles   = gitData?.churnFiles   || MOCK_CHURN
  const isLive       = !!gitData

  const branches = ["all", ...new Set(commits.map(c=>c.branch))]
  const filtered = commits.filter(c => {
    const ms = c.message.toLowerCase().includes(search.toLowerCase())||c.author.toLowerCase().includes(search.toLowerCase())||c.hash.toLowerCase().includes(search.toLowerCase())
    return ms && (filter==="all"||c.branch===filter)
  })

  const th = { padding:"8px 12px", textAlign:"left", fontFamily:"monospace", fontSize:9, textTransform:"uppercase", letterSpacing:"0.1em", color: T.textHint, borderBottom:`1px solid ${T.border}`, background: T.surfaceAlt, fontWeight:600 }

  return (
    <div style={{ padding:20, background: T.bg, minHeight:"100%", color: T.text, fontFamily:"monospace" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color: T.text, marginBottom:2 }}>git activity</div>
          <div style={{ fontSize:11, color: T.textHint }}>commit history · contributors · code churn</div>
        </div>
        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:10, fontFamily:"monospace", background: isLive?T.greenLight:T.orangeLight, border:`1px solid ${isLive?T.greenBorder:T.orangeBorder}`, color: isLive?T.green:T.orange }}>
          {isLive?"● live":"● mock"}
        </span>
      </div>

      {loading && <div style={{ padding:"10px 14px", borderRadius: T.r, marginBottom:16, background: T.brandLight, border:`1px solid ${T.brandBorder}`, fontSize:11, color: T.brand }}>⏳ reading git history…</div>}
      {error   && <div style={{ padding:"10px 14px", borderRadius: T.r, marginBottom:16, background: T.orangeLight, border:`1px solid ${T.orangeBorder}`, borderLeft:`3px solid ${T.orange}`, fontSize:11, color: T.orange }}>⚠ {error} showing mock data.</div>}

      {/* Commit & Push bar */}
      {projectPath && <CommitPushBar projectPath={projectPath} activeBranch={stats.activeBranch} />}

      {/* Stats */}
      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        <StatCard label="total commits"  value={stats.totalCommits} color={T.teal} />
        <StatCard label="contributors"   value={stats.contributors} color={T.blue} />
        <StatCard label="this week"      value={stats.thisWeek}     color={T.brand} />
        <StatCard label="files changed"  value={stats.filesChanged} color={T.orange} />
      </div>

      {/* Branch + adds/dels */}
      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        <div style={{ flex:1, background: T.surface, border:`1px solid ${T.border}`, borderRadius: T.rMd, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:9, color: T.textHint, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>active branch</div>
            <div style={{ fontSize:14, fontWeight:700, color: T.text }}>{stats.activeBranch}</div>
          </div>
          <div style={{ fontSize:10, color: T.textHint }}>last: {stats.lastCommit}</div>
        </div>
        <div style={{ flex:1, background: T.surface, border:`1px solid ${T.border}`, borderRadius: T.rMd, padding:"12px 16px", display:"flex", gap:20, alignItems:"center" }}>
          <div><div style={{ fontSize:9, color: T.textHint, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>additions</div><div style={{ fontSize:18, fontWeight:700, color: T.green }}>+{stats.additions.toLocaleString()}</div></div>
          <div style={{ width:1, height:28, background: T.border }} />
          <div><div style={{ fontSize:9, color: T.textHint, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>deletions</div><div style={{ fontSize:18, fontWeight:700, color: T.red }}>-{stats.deletions.toLocaleString()}</div></div>
        </div>
      </div>

      <Heatmap data={heatmap} />

      {/* Contributors */}
      <div style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius: T.rMd, overflow:"hidden", marginBottom:20 }}>
        <div style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}` }}><SectionTitle>contributors</SectionTitle></div>
        <div style={{ padding:"12px 14px" }}>
          <div style={{ height:6, borderRadius:3, overflow:"hidden", display:"flex", marginBottom:14 }}>
            {contributors.map(c=><div key={c.name} style={{ width:`${c.pct}%`, height:"100%", background: getAuthorColor(c.name) }} />)}
          </div>
          {contributors.map(c => {
            const color = getAuthorColor(c.name)
            return (
              <div key={c.name} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ width:30, height:30, borderRadius:8, background:`${color}18`, border:`1px solid ${color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color, flexShrink:0 }}>{getInitials(c.name)}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color: T.text, marginBottom:3 }}>{c.name}</div>
                  <div style={{ height:4, background: T.surfaceAlt, borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${c.pct}%`, background: color, borderRadius:2 }} />
                  </div>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color, flexShrink:0 }}>{c.pct}%</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Commits table */}
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:13, fontWeight:700, color: T.text, marginBottom:10 }}>recent commits</div>
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <div style={{ position:"relative", flex:1 }}>
            <input placeholder="search commits, authors…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{ width:"100%", padding:"7px 12px 7px 30px", background: T.surface, border:`1px solid ${T.border}`, borderRadius: T.r, color: T.text, fontFamily:"monospace", fontSize:11, outline:"none", boxSizing:"border-box" }} />
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color: T.textHint }}>⌕</span>
          </div>
          {branches.map(b=>(
            <button key={b} onClick={()=>setFilter(b)} style={{ padding:"6px 12px", borderRadius: T.r, border:`1px solid ${filter===b?T.brandBorder:T.border}`, background: filter===b?T.brandLight:"transparent", color: filter===b?T.brand:T.textSub, cursor:"pointer", fontSize:11, fontFamily:"monospace" }}>{b}</button>
          ))}
        </div>
      </div>
      <div style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius: T.rMd, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr><th style={th}>hash</th><th style={th}>message</th><th style={th}>author</th><th style={th}>branch</th><th style={th}>+/-</th><th style={th}>date</th></tr>
          </thead>
          <tbody>
            {filtered.length===0 ? (
              <tr><td colSpan={6} style={{ padding:28, textAlign:"center", color: T.textHint, fontSize:12 }}>no commits match</td></tr>
            ) : filtered.map(c=>(
              <CommitRow key={c.hash} c={c} expanded={expanded===c.hash} onToggle={()=>setExpanded(expanded===c.hash?null:c.hash)} />
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop:6, fontSize:10, color: T.textHint }}>{filtered.length} of {commits.length} commits</div>
    </div>
  )
}