import React from "react"
import { useProjectStore } from "../state/projectStore"
import { T } from "../theme"

// ── Helpers ───────────────────────────────────────────────────────────────────
const riskColor = r => ({ critical:T.red, high:T.orange, medium:T.amber, low:T.green }[r]||T.green)
const ecoColor  = e => ({ npm:T.red, pip:T.blue, cargo:T.orange, gem:T.green, composer:"#8b5cf6", go:T.teal }[e]||T.textHint)
const fileName  = p => (p||"").replace(/\\/g,"/").split("/").pop()
const isExt     = i => !i.startsWith(".")&&!i.startsWith("/")
const cleanVer  = v => (v||"").replace(/[\^~>=<*\s]/g,"").split(",")[0]||"unknown"

// ── Registry fetchers ─────────────────────────────────────────────────────────
const fetchNpm     = async n => { try { const r=await fetch(`https://registry.npmjs.org/${encodeURIComponent(n)}/latest`,{headers:{"Accept":"application/json"}}); return r.ok?await r.json():null } catch{return null} }
const fetchPypi    = async n => { try { const r=await fetch(`https://pypi.org/pypi/${encodeURIComponent(n)}/json`);           return r.ok?await r.json():null } catch{return null} }
const fetchCrates  = async n => { try { const r=await fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(n)}`,{headers:{"User-Agent":"CodeCompass/1.0"}}); return r.ok?await r.json():null } catch{return null} }
const fetchGem     = async n => { try { const r=await fetch(`https://rubygems.org/api/v1/gems/${encodeURIComponent(n)}.json`); return r.ok?await r.json():null } catch{return null} }

// ── Risk calculator ───────────────────────────────────────────────────────────
function calcRisk(installed, latest, deprecated) {
  let score=0, reasons=[]
  if (deprecated) { score+=40; reasons.push("Package is deprecated") }
  const cv=cleanVer(installed), lv=cleanVer(latest||"")
  if (cv!=="unknown"&&lv&&cv!==lv) {
    const pi=cv.split(".").map(n=>parseInt(n)||0)
    const pl=lv.split(".").map(n=>parseInt(n)||0)
    const maj=Math.max(0,(pl[0]||0)-(pi[0]||0))
    const min=Math.max(0,(pl[1]||0)-(pi[1]||0))
    if      (maj>=2) { score+=35; reasons.push(`${maj} major versions behind (${cv} → ${lv})`) }
    else if (maj===1){ score+=20; reasons.push(`1 major version behind (${cv} → ${lv})`) }
    else if (min>=5) { score+=10; reasons.push(`${min} minor versions behind`) }
    else if (min>0)  { score+=3;  reasons.push("Minor/patch update available") }
  }
  const risk = score>=35?"critical":score>=20?"high":score>=10?"medium":"low"
  return { score, risk, reasons }
}

// ── Package parsers ───────────────────────────────────────────────────────────
function parseNpm(c) { try { const p=JSON.parse(c),deps={...(p.dependencies||{}),...(p.devDependencies||{})},dev=new Set(Object.keys(p.devDependencies||{})); return Object.entries(deps).map(([name,ver])=>({name,installed:cleanVer(ver),isDev:dev.has(name),ecosystem:"npm"})) } catch{return[]} }
function parsePip(c) { return c.split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("#")&&!l.startsWith("-")).map(l=>{const m=l.match(/^([A-Za-z0-9_.-]+)\s*(?:[>=<!~^]+\s*([^\s,;]+))?/);return m?{name:m[1],installed:m[2]?cleanVer(m[2]):"unknown",isDev:false,ecosystem:"pip"}:null}).filter(Boolean) }
function parseGem(c) { return c.split("\n").map(l=>l.match(/^\s*gem\s+['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]+)['"])?/)).filter(Boolean).map(m=>({name:m[1],installed:m[2]?cleanVer(m[2]):"unknown",isDev:false,ecosystem:"gem"})) }
function parseCargo(c) { const s=c.match(/\[dependencies\]([\s\S]*?)(\[|$)/)?.[1]||""; return s.split("\n").map(l=>l.match(/^([a-zA-Z0-9_-]+)\s*=\s*["']?([^"',\n\s]+)/)).filter(Boolean).map(m=>({name:m[1],installed:cleanVer(m[2]),isDev:false,ecosystem:"cargo"})) }
function parseGo(c) { const b=c.match(/require\s*\(([\s\S]*?)\)/)?.[1]||""; return b.split("\n").map(l=>l.trim().match(/^(\S+)\s+v?([^\s/]+)/)).filter(m=>m&&!m[1].startsWith("//")).map(m=>({name:m[1],installed:m[2],isDev:false,ecosystem:"go"})) }
function parseComposer(c) { try{const p=JSON.parse(c),all={...(p.require||{}),...(p["require-dev"]||{})},dev=new Set(Object.keys(p["require-dev"]||{})); return Object.entries(all).filter(([n])=>n!=="php"&&!n.startsWith("ext-")).map(([name,ver])=>({name,installed:cleanVer(ver),isDev:dev.has(name),ecosystem:"composer"}))} catch{return[]} }

const isManifest=(path,...names)=>{const b=(path||"").replace(/\\/g,"/").toLowerCase().split("/").pop(); return names.some(n=>b===n.toLowerCase()||b===n.toLowerCase().replace(/\.[^.]+$/,""))}

function extractPackages(files) {
  const all=[]
  for (const f of files) {
    const c=f.content||""; if(!c) continue
    if (isManifest(f.path,"package.json"))      try{all.push(...parseNpm(c))}catch{}
    else if (isManifest(f.path,"requirements.txt")) try{all.push(...parsePip(c))}catch{}
    else if (isManifest(f.path,"Gemfile"))       try{all.push(...parseGem(c))}catch{}
    else if (isManifest(f.path,"Cargo.toml"))    try{all.push(...parseCargo(c))}catch{}
    else if (isManifest(f.path,"go.mod"))        try{all.push(...parseGo(c))}catch{}
    else if (isManifest(f.path,"composer.json")) try{all.push(...parseComposer(c))}catch{}
  }
  const seen=new Set()
  return all.filter(p=>{const k=`${p.ecosystem}:${p.name}`;if(seen.has(k))return false;seen.add(k);return true})
}

async function enrichPkg(pkg) {
  try {
    let latest=null,deprecated=null,license="unknown",description=""
    if (pkg.ecosystem==="npm")      { const i=await fetchNpm(pkg.name);    latest=i?.version||null; deprecated=typeof i?.deprecated==="string"?i.deprecated:null; license=i?.license||"unknown"; description=(i?.description||"").slice(0,100) }
    else if(pkg.ecosystem==="pip")  { const i=await fetchPypi(pkg.name);   latest=i?.info?.version||null; license=i?.info?.license||"unknown"; description=(i?.info?.summary||"").slice(0,100); if((i?.info?.classifiers||[]).some(c=>c.includes("Inactive")||c.includes("Abandoned")))deprecated="Project marked inactive" }
    else if(pkg.ecosystem==="cargo"){ const i=await fetchCrates(pkg.name); latest=i?.crate?.newest_version||null; license=i?.crate?.license||"unknown"; description=(i?.crate?.description||"").slice(0,100) }
    else if(pkg.ecosystem==="gem")  { const i=await fetchGem(pkg.name);    latest=i?.version||null; license=(i?.licenses||[]).join(", ")||"unknown"; description=(i?.info||"").slice(0,100) }
    else if(pkg.ecosystem==="go")   { return {...pkg,latest:"see pkg.go.dev",isOutdated:false,deprecated:null,license:"unknown",description:"",riskScore:0,risk:"low",reasons:[]} }
    else if(pkg.ecosystem==="composer") { try{const r=await fetch(`https://repo.packagist.org/p2/${pkg.name.replace("/","%2F")}.json`);if(r.ok){const d=await r.json();latest=d?.packages?.[pkg.name]?.[0]?.version?.replace(/^v/,"")||null}}catch{} }
    const {score,risk,reasons}=calcRisk(pkg.installed,latest,deprecated)
    return {...pkg,latest:latest||"unknown",isOutdated:latest?cleanVer(pkg.installed)!==cleanVer(latest):false,deprecated,license,description,riskScore:score,risk,reasons}
  } catch { return {...pkg,latest:"unknown",isOutdated:false,deprecated:null,license:"unknown",description:"",riskScore:0,risk:"low",reasons:[]} }
}

// ── Shared UI pieces ──────────────────────────────────────────────────────────
const Label = ({children,mb=6}) => <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",color:T.textHint,fontFamily:"monospace",fontWeight:600,marginBottom:mb}}>{children}</div>

function StatCard({label,value,sub,color}) {
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.rMd,padding:"12px 16px",flex:1,borderTop:`2px solid ${color}`,minWidth:0}}>
      <Label>{label}</Label>
      <div style={{fontSize:22,fontWeight:700,color,lineHeight:1,fontFamily:"monospace"}}>{value}</div>
      {sub&&<div style={{fontSize:9,color:T.textHint,fontFamily:"monospace",marginTop:4}}>{sub}</div>}
    </div>
  )
}

function Badge({label,color}) {
  return <span style={{display:"inline-block",padding:"2px 8px",borderRadius:4,fontSize:10,fontFamily:"monospace",fontWeight:700,background:`${color}18`,border:`1px solid ${color}33`,color}}>{label}</span>
}

// ── Risk Table ────────────────────────────────────────────────────────────────
function RiskTable({packages,loading,progress,error,onRetry}) {
  const [search,  setSearch]  = React.useState("")
  const [riskF,   setRiskF]   = React.useState("all")
  const [ecoF,    setEcoF]    = React.useState("all")
  const [typeF,   setTypeF]   = React.useState("all")
  const [expanded,setExpanded]= React.useState(null)

  const counts = React.useMemo(()=>({ all:packages.length, critical:packages.filter(p=>p.risk==="critical").length, high:packages.filter(p=>p.risk==="high").length, medium:packages.filter(p=>p.risk==="medium").length, low:packages.filter(p=>p.risk==="low").length }), [packages])
  const ecos   = [...new Set(packages.map(p=>p.ecosystem))]
  const filtered = React.useMemo(()=>packages.filter(p=>{
    if(riskF!=="all"&&p.risk!==riskF) return false
    if(ecoF!=="all"&&p.ecosystem!==ecoF) return false
    if(typeF==="dev"&&!p.isDev) return false
    if(typeF==="prod"&&p.isDev) return false
    if(search&&!p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }),[packages,riskF,ecoF,typeF,search])

  const th = { padding:"8px 12px",textAlign:"left",fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",color:T.textHint,borderBottom:`1px solid ${T.border}`,fontWeight:600,background:T.surfaceAlt }

  if (loading) return (
    <div style={{padding:48,textAlign:"center"}}>
      <div style={{fontSize:28,marginBottom:14}}>⏳</div>
      <div style={{fontSize:13,fontWeight:700,color:T.brand,marginBottom:6}}>Fetching registry data…</div>
      <div style={{fontSize:11,color:T.textHint,fontFamily:"monospace",marginBottom:14}}>{progress.done} / {progress.total} packages</div>
      <div style={{height:4,background:T.border,borderRadius:2,overflow:"hidden",maxWidth:280,margin:"0 auto"}}>
        <div style={{height:"100%",background:T.brand,borderRadius:2,width:progress.total>0?`${Math.round(progress.done/progress.total*100)}%`:"0%",transition:"width 0.3s"}} />
      </div>
      {progress.current&&<div style={{fontSize:10,color:T.textHint,fontFamily:"monospace",marginTop:8}}>checking: {progress.current}</div>}
    </div>
  )

  if (error) return (
    <div>
      <div style={{padding:14,borderRadius:T.rMd,background:T.redLight,border:`1px solid ${T.redBorder}`,borderLeft:`3px solid ${T.red}`,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:T.red,marginBottom:4}}>Analysis Failed</div>
        <div style={{fontSize:12,color:T.textSub,fontFamily:"monospace",lineHeight:1.6}}>{error}</div>
      </div>
      <div style={{fontSize:11,color:T.textHint,fontFamily:"monospace",lineHeight:1.8,marginBottom:12}}>
        Needs one of: <span style={{color:T.red}}>package.json</span> · <span style={{color:T.blue}}>requirements.txt</span> · <span style={{color:T.orange}}>Cargo.toml</span> · <span style={{color:T.green}}>Gemfile</span> · <span style={{color:T.teal}}>go.mod</span> · <span style={{color:"#8b5cf6"}}>composer.json</span>
      </div>
      <button onClick={onRetry} style={{padding:"6px 16px",borderRadius:T.r,border:`1px solid ${T.brandBorder}`,background:T.brandLight,color:T.brand,cursor:"pointer",fontSize:12,fontFamily:"monospace"}}>↺ Retry</button>
    </div>
  )

  if (!packages.length) return (
    <div style={{padding:60,textAlign:"center",color:T.textHint}}>
      <div style={{fontSize:30,marginBottom:14}}>📦</div>
      <div style={{fontSize:14,fontWeight:700,color:T.textSub,marginBottom:8}}>No packages found</div>
      <div style={{fontSize:12,fontFamily:"monospace",lineHeight:1.7}}>Import a project with a manifest file:<br/>
        <span style={{color:T.red}}>package.json</span> · <span style={{color:T.blue}}>requirements.txt</span> · <span style={{color:T.orange}}>Cargo.toml</span> · <span style={{color:T.green}}>Gemfile</span> · <span style={{color:T.teal}}>go.mod</span> · <span style={{color:"#8b5cf6"}}>composer.json</span>
      </div>
    </div>
  )

  return (
    <div>
      {/* Filter row */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:10}}>
        <Label mb={0}>Risk</Label>
        {["all","critical","high","medium","low"].map(r=>{
          const color=r==="all"?T.text:riskColor(r),active=riskF===r
          return <button key={r} onClick={()=>setRiskF(r)} style={{padding:"3px 10px",borderRadius:20,border:"1px solid",borderColor:active?`${color}55`:T.border,background:active?`${color}14`:"transparent",color:active?color:T.textHint,fontSize:10,fontFamily:"monospace",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            {r}<span style={{fontSize:9,padding:"0 4px",borderRadius:3,background:active?`${color}20`:T.surfaceAlt,color:active?color:T.textHint}}>{counts[r]||0}</span>
          </button>
        })}
        <div style={{width:1,height:16,background:T.border}} />
        <select value={ecoF} onChange={e=>setEcoF(e.target.value)} style={{padding:"4px 8px",borderRadius:T.r,border:`1px solid ${T.border}`,background:T.surface,color:T.textSub,fontFamily:"monospace",fontSize:10,outline:"none",cursor:"pointer"}}>
          <option value="all">All ecosystems</option>
          {ecos.map(e=><option key={e} value={e}>{e}</option>)}
        </select>
        {["all","prod","dev"].map(t=>(
          <button key={t} onClick={()=>setTypeF(t)} style={{padding:"3px 10px",borderRadius:T.r,border:"1px solid",borderColor:typeF===t?"#8b5cf655":T.border,background:typeF===t?"#8b5cf614":"transparent",color:typeF===t?"#8b5cf6":T.textHint,fontSize:10,fontFamily:"monospace",cursor:"pointer"}}>{t==="all"?"all types":t}</button>
        ))}
        <div style={{marginLeft:"auto",position:"relative"}}>
          <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:T.textHint,fontSize:12,pointerEvents:"none"}}>⌕</span>
          <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{padding:"5px 10px 5px 28px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.r,color:T.text,fontFamily:"monospace",fontSize:11,outline:"none",width:180}} />
        </div>
      </div>
      <div style={{fontSize:10,color:T.textHint,fontFamily:"monospace",marginBottom:10}}>Showing {filtered.length} of {packages.length} packages</div>

      {/* Table */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.rMd,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              <th style={{...th,width:"24%"}}>Package</th><th style={{...th,width:"9%"}}>Ecosystem</th>
              <th style={{...th,width:"11%"}}>Installed</th><th style={{...th,width:"11%"}}>Latest</th>
              <th style={{...th,width:"8%"}}>Type</th><th style={{...th,width:"9%"}}>Risk</th>
              <th style={th}>Issues</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 ? (
              <tr><td colSpan={7} style={{padding:28,textAlign:"center",color:T.textHint,fontFamily:"monospace",fontSize:12}}>No packages match</td></tr>
            ) : filtered.map(pkg=>{
              const rc=riskColor(pkg.risk),ec=ecoColor(pkg.ecosystem),key=`${pkg.ecosystem}:${pkg.name}`,isExp=expanded===key,isOutd=pkg.isOutdated
              const td = {padding:"9px 12px",borderBottom:`1px solid ${T.border}`}
              return (
                <React.Fragment key={key}>
                  <tr onClick={()=>setExpanded(isExp?null:key)} style={{cursor:"pointer"}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.surfaceAlt}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={td}>
                      <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                        {pkg.deprecated&&<span style={{fontSize:9,color:T.red,background:T.redLight,border:`1px solid ${T.redBorder}`,padding:"1px 5px",borderRadius:3,fontWeight:700}}>DEPRECATED</span>}
                        <span style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:"monospace"}}>{pkg.name}</span>
                      </div>
                      {pkg.description&&<div style={{fontSize:10,color:T.textHint,fontFamily:"monospace",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220}}>{pkg.description}</div>}
                    </td>
                    <td style={td}><Badge label={pkg.ecosystem} color={ec} /></td>
                    <td style={td}><span style={{fontSize:11,fontFamily:"monospace",color:isOutd?T.orange:T.textSub}}>{pkg.installed||"—"}</span></td>
                    <td style={td}>{pkg.latest==="unknown"?<span style={{fontSize:10,color:T.textHint,fontFamily:"monospace"}}>fetching…</span>:<span style={{fontSize:11,fontFamily:"monospace",color:isOutd?T.green:T.textHint}}>{pkg.latest}</span>}</td>
                    <td style={td}><Badge label={pkg.isDev?"dev":"prod"} color={pkg.isDev?"#8b5cf6":T.blue} /></td>
                    <td style={td}><Badge label={pkg.risk.toUpperCase()} color={rc} /></td>
                    <td style={td}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                        <span style={{fontSize:11,fontFamily:"monospace",color:pkg.reasons.length>0?rc:T.green,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pkg.reasons.length>0?pkg.reasons[0]+(pkg.reasons.length>1?` +${pkg.reasons.length-1} more`:""):"✓ Up to date"}</span>
                        <span style={{color:T.textHint,fontSize:10,transform:isExp?"rotate(90deg)":"rotate(0deg)",flexShrink:0}}>▶</span>
                      </div>
                    </td>
                  </tr>
                  {isExp&&(
                    <tr><td colSpan={7} style={{padding:"0 12px 12px",borderBottom:`1px solid ${T.border}`,background:T.surfaceAlt}}>
                      <div style={{padding:"12px 14px",borderRadius:T.rMd,background:T.surface,border:`1px solid ${T.border}`,display:"flex",gap:24,flexWrap:"wrap",fontSize:11,fontFamily:"monospace"}}>
                        <div><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",color:T.textHint,marginBottom:3}}>License</div><div style={{color:T.text}}>{pkg.license}</div></div>
                        <div><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",color:T.textHint,marginBottom:3}}>Risk Score</div><div style={{color:rc}}>{pkg.riskScore}/100</div></div>
                        <div><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",color:T.textHint,marginBottom:3}}>Update</div><div style={{color:isOutd?T.orange:T.green}}>{isOutd?`${pkg.installed} → ${pkg.latest}`:"Up to date"}</div></div>
                        {pkg.deprecated&&<div style={{flex:1}}><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",color:T.textHint,marginBottom:3}}>Deprecation</div><div style={{color:T.red,lineHeight:1.5}}>{pkg.deprecated}</div></div>}
                        {pkg.reasons.length>0&&<div style={{flex:1}}><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",color:T.textHint,marginBottom:3}}>All Issues</div>{pkg.reasons.map((r,i)=><div key={i} style={{color:T.textSub,marginBottom:2,lineHeight:1.5}}>• {r}</div>)}</div>}
                        <div style={{marginLeft:"auto"}}>
                          <a href={pkg.ecosystem==="npm"?`https://www.npmjs.com/package/${pkg.name}`:pkg.ecosystem==="pip"?`https://pypi.org/project/${pkg.name}`:pkg.ecosystem==="cargo"?`https://crates.io/crates/${pkg.name}`:pkg.ecosystem==="gem"?`https://rubygems.org/gems/${pkg.name}`:pkg.ecosystem==="composer"?`https://packagist.org/packages/${pkg.name}`:`https://pkg.go.dev/${pkg.name}`}
                            target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                            style={{padding:"4px 10px",borderRadius:T.r,border:`1px solid ${T.border}`,color:T.textHint,fontSize:10,textDecoration:"none",fontFamily:"monospace",display:"inline-block"}}
                            onMouseEnter={e=>{e.target.style.borderColor=T.brandBorder;e.target.style.color=T.brand}}
                            onMouseLeave={e=>{e.target.style.borderColor=T.border;e.target.style.color=T.textHint}}
                          >View on registry ↗</a>
                        </div>
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Import Dependencies Panel ─────────────────────────────────────────────────
function ImportDepsPanel({files}) {
  const [selected,setSelected]=React.useState(null)
  const sc = s => s>15?T.red:s>8?T.orange:T.green

  const fanIn = selected ? files.filter(f=>f.path!==selected.path&&(f.imports||[]).some(imp=>imp.includes(fileName(selected.path).replace(/\.(jsx|tsx|js|ts)$/,"")))) : []
  const fanOut = selected ? (selected.imports||[]) : []

  const insights = React.useMemo(()=>{
    if (!selected) return []
    const score=selected._meta?.stressScore||0, out=[]
    if      (score>15)       out.push({icon:"🔴",text:"Critical stress",   desc:"Very high coupling — refactoring priority",  color:T.red   })
    else if (score>8)        out.push({icon:"🟡",text:"Moderate stress",   desc:"Monitor as project grows",                   color:T.orange})
    if (fanIn.length>=3)     out.push({icon:"🔥",text:"Core module",       desc:`${fanIn.length} files depend on this`,       color:T.blue  })
    if (!fanIn.length&&!["App.","main.","index."].some(x=>selected.path.includes(x)))
                             out.push({icon:"👻",text:"Possibly unused",   desc:"Zero incoming imports — may be dead code",   color:"#8b5cf6"})
    if ((selected.imports?.length||0)>5)
                             out.push({icon:"⚠️",text:"High fan-out",      desc:`Imports ${selected.imports.length} modules`, color:T.orange})
    if (!out.length)         out.push({icon:"✅",text:"Healthy module",    desc:"No coupling issues detected",               color:T.green })
    return out
  },[selected,fanIn])

  const panelHdr=(color,title,sub)=>(
    <div style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,background:T.surfaceAlt}}>
      <div style={{fontSize:12,fontWeight:700,color}}>{title}</div>
      <div style={{fontSize:9,color:T.textHint,fontFamily:"monospace",marginTop:2}}>{sub}</div>
    </div>
  )

  return (
    <div>
      <div style={{marginBottom:18}}>
        <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",color:T.textHint,fontFamily:"monospace",marginBottom:6}}>Select file to inspect</div>
        <select value={selected?.path||""} onChange={e=>setSelected(files.find(f=>f.path===e.target.value)||null)}
          style={{width:"100%",padding:"8px 12px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.r,color:T.text,fontFamily:"monospace",fontSize:12,outline:"none",cursor:"pointer"}}>
          <option value="">— choose a file —</option>
          {files.map((f,i)=><option key={`${f.path}-${i}`} value={f.path}>{f.path}</option>)}
        </select>
      </div>

      {selected ? (
        <>
          <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:16}}>
            {/* Fan-in */}
            <div style={{flex:1,background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.rMd,overflow:"hidden"}}>
              {panelHdr(T.green,"← Used By","files that import this module")}
              <div style={{padding:8}}>
                {!fanIn.length ? <div style={{padding:10,fontSize:11,color:T.textHint,fontFamily:"monospace"}}>No files import this module</div>
                : fanIn.map((f,i)=>(
                  <div key={i} style={{padding:"6px 9px",borderRadius:T.r,marginBottom:4,background:T.surfaceAlt,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
                    <span style={{fontSize:10,color:T.text,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>← {fileName(f.path)}</span>
                    <span style={{fontSize:9,padding:"1px 6px",borderRadius:3,flexShrink:0,background:`${sc(f._meta?.stressScore||0)}18`,color:sc(f._meta?.stressScore||0),fontFamily:"monospace"}}>{f._meta?.stressScore||0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Center node */}
            <div style={{width:150,flexShrink:0,background:T.surface,border:`1px solid ${sc(selected._meta?.stressScore||0)}44`,borderRadius:T.rMd,padding:"12px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:7}}>
              <div style={{fontSize:20}}>📄</div>
              <div style={{fontSize:10,fontWeight:700,color:T.text,fontFamily:"monospace",textAlign:"center",wordBreak:"break-all"}}>{fileName(selected.path)}</div>
              <div style={{fontSize:9,padding:"2px 8px",borderRadius:3,background:`${sc(selected._meta?.stressScore||0)}18`,color:sc(selected._meta?.stressScore||0),fontFamily:"monospace",fontWeight:700}}>stress: {selected._meta?.stressScore||0}</div>
              <div style={{fontSize:9,color:T.textHint,fontFamily:"monospace",textAlign:"center"}}>{selected.imports?.length||0} imports<br/>{selected._meta?.incoming||0} incoming</div>
            </div>

            {/* Fan-out */}
            <div style={{flex:1,background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.rMd,overflow:"hidden"}}>
              {panelHdr(T.blue,"→ Imports","modules this file depends on")}
              <div style={{padding:8}}>
                {!fanOut.length ? <div style={{padding:10,fontSize:11,color:T.textHint,fontFamily:"monospace"}}>No imports</div>
                : fanOut.map((imp,i)=>(
                  <div key={i} style={{padding:"6px 9px",borderRadius:T.r,marginBottom:4,background:T.surfaceAlt,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:9,width:20,flexShrink:0,fontFamily:"monospace",color:isExt(imp)?"#8b5cf6":T.blue}}>{isExt(imp)?"pkg":"rel"}</span>
                    <span style={{fontSize:10,color:T.text,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{imp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.rMd,overflow:"hidden"}}>
            {panelHdr(T.text,"Insights",`auto-generated analysis for ${fileName(selected.path)}`)}
            <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
              {insights.map((ins,i)=>(
                <div key={i} style={{padding:"9px 12px",borderRadius:T.r,background:T.surfaceAlt,border:`1px solid ${ins.color}22`,borderLeft:`3px solid ${ins.color}`,display:"flex",gap:10,alignItems:"flex-start"}}>
                  <span style={{fontSize:14,flexShrink:0}}>{ins.icon}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:ins.color,marginBottom:2}}>{ins.text}</div>
                    <div style={{fontSize:11,color:T.textSub,lineHeight:1.5}}>{ins.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{border:`1px dashed ${T.border}`,borderRadius:T.rMd,padding:40,textAlign:"center",color:T.textHint,fontFamily:"monospace",fontSize:12}}>
          ↑ Select a file above to inspect its dependency relationships
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DependencyLens() {
  const { files } = useProjectStore()
  const [activeTab, setActiveTab] = React.useState("npm")
  const [packages,  setPackages]  = React.useState([])
  const [loading,   setLoading]   = React.useState(false)
  const [progress,  setProgress]  = React.useState({done:0,total:0,current:""})
  const [error,     setError]     = React.useState(null)
  const [ecos,      setEcos]      = React.useState([])
  const [analyzed,  setAnalyzed]  = React.useState(false)
  const abortRef = React.useRef(false)

  const runAnalysis = React.useCallback(async () => {
    if (!files.length) return
    const raw = extractPackages(files)
    if (!raw.length) { setError("No package manifest files found. Needs package.json, requirements.txt, Cargo.toml, Gemfile, go.mod, or composer.json."); return }
    setLoading(true); setError(null); setPackages([]); setProgress({done:0,total:raw.length,current:""}); abortRef.current=false
    const enriched=[]
    const BATCH=5
    for (let i=0;i<raw.length;i+=BATCH) {
      if (abortRef.current) break
      const batch=raw.slice(i,i+BATCH)
      enriched.push(...await Promise.all(batch.map(enrichPkg)))
      const sorted=[...enriched].sort((a,b)=>b.riskScore-a.riskScore)
      setPackages(sorted); setProgress({done:Math.min(i+BATCH,raw.length),total:raw.length,current:batch[0]?.name||""}); setEcos([...new Set(sorted.map(p=>p.ecosystem))])
    }
    setLoading(false); setAnalyzed(true)
  }, [files])

  React.useEffect(() => { if (files.length>0&&!analyzed&&!loading) runAnalysis(); return ()=>{abortRef.current=true} }, [files.length])

  const critical=packages.filter(p=>p.risk==="critical").length
  const high    =packages.filter(p=>p.risk==="high").length
  const outdated=packages.filter(p=>p.isOutdated).length

  return (
    <div style={{padding:24,background:T.bg,minHeight:"100%",color:T.text,fontFamily:"monospace"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:2}}>Dependency Lens</div>
          <div style={{fontSize:11,color:T.textHint}}>// package risk analysis · npm · pip · cargo · gem · composer · go</div>
        </div>
        {files.length>0&&(
          <button onClick={()=>{setAnalyzed(false);runAnalysis()}} disabled={loading}
            style={{padding:"6px 14px",borderRadius:T.r,border:`1px solid ${T.border}`,background:T.surface,color:loading?T.textHint:T.brand,cursor:loading?"not-allowed":"pointer",fontSize:12,fontFamily:"monospace"}}>
            {loading?`Analyzing… ${progress.done}/${progress.total}`:"↺ Refresh"}
          </button>
        )}
      </div>

      <div style={{display:"flex",gap:10,marginBottom:20}}>
        <StatCard label="Total Packages" value={packages.length||(loading?"…":"—")} color={T.blue}   />
        <StatCard label="Ecosystems"     value={ecos.length||(loading?"…":"—")}     color="#8b5cf6" sub={ecos.join(", ")||"none"} />
        <StatCard label="Critical Risk"  value={critical||(loading?"…":"—")}         color={T.red}   sub="deprecated or 2+ major" />
        <StatCard label="High Risk"      value={high||(loading?"…":"—")}             color={T.orange} sub="1 major behind" />
        <StatCard label="Outdated"       value={outdated||(loading?"…":"—")}         color={T.amber} sub="any version mismatch" />
      </div>

      <div style={{display:"flex",gap:2,marginBottom:18,borderBottom:`1px solid ${T.border}`}}>
        {[{id:"npm",label:"📦 Package Risk"},{id:"imports",label:"🔗 Import Dependencies"}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:"8px 16px",background:"transparent",border:"none",borderBottom:`2px solid ${activeTab===t.id?T.brand:"transparent"}`,color:activeTab===t.id?T.brand:T.textHint,fontSize:12,fontFamily:"monospace",cursor:"pointer"}}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab==="npm" && <RiskTable packages={packages} loading={loading&&!packages.length} progress={progress} error={error} onRetry={()=>{setAnalyzed(false);setError(null);runAnalysis()}} />}
      {activeTab==="imports" && <ImportDepsPanel files={files} />}
    </div>
  )
}
