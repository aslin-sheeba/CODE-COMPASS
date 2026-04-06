import React, { useEffect, useRef, useState, useCallback } from "react"
import { forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide, forceX, forceY } from "d3-force"
import { useProjectStore } from "../state/projectStore"
import { T } from "../theme"

// ── Graph Search ───────────────────────────────────────────────────────────────
function GraphSearch() {
  const { files, setHighlightedFile } = useProjectStore()
  const [query,   setQuery]   = React.useState("")
  const [results, setResults] = React.useState([])

  React.useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const q = query.toLowerCase()
    setResults(files.filter(f => f.path.toLowerCase().includes(q)).slice(0, 8))
  }, [query, files])

  return (
    <div style={{ position: "relative" }}>
      <input
        placeholder="⌕  Search nodes..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width: "100%", padding: "8px 12px", background: T.surface, border: "none", borderBottom: `1px solid ${T.border}`, color: T.text, fontFamily: "monospace", fontSize: 12, outline: "none", boxSizing: "border-box" }}
      />
      {results.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.surface, border: `1px solid ${T.border}`, zIndex: 20, maxHeight: 200, overflowY: "auto", borderTop: "none" }}>
          {results.map((f, i) => (
            <div key={i}
              onClick={() => { setHighlightedFile(f); setQuery(""); setResults([]) }}
              style={{ padding: "7px 12px", cursor: "pointer", fontSize: 11, color: T.textSub, fontFamily: "monospace", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 8, alignItems: "center" }}
              onMouseEnter={e => e.currentTarget.style.background = T.surfaceAlt}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.path.replace(/\\/g, "/").split("/").pop()}
              </span>
              <span style={{ color: T.textHint, fontSize: 9, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{f.path}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const nodeColor = s => s > 20 ? T.red : s > 10 ? T.orange : T.green

export default function ModuleGraph({ width = 1000, height = 600, activeCycle }) {
  const { files, selectFile, highlightedFile } = useProjectStore()
  const simRef = useRef()
  const rafRef = useRef()         // track RAF id for cancellation (#3)

  const [nodes,       setNodes]       = useState([])
  const [links,       setLinks]       = useState([])
  const [focused,     setFocused]     = useState(null)
  const [treeNodes,   setTreeNodes]   = useState(new Set())
  const [cycleEdges,  setCycleEdges]  = useState(new Set())
  const [hoveredNode, setHoveredNode] = useState(null)
  const [transform,   setTransform]   = useState({ x: 0, y: 0, k: 1 })

  // Build graph
  useEffect(() => {
    const nodeMap = {}
    const n = files.map(f => {
      const imports = f.imports || []
      const node = { id: f.path, file: f, imports, stress: f._meta?.stressScore || 0, group: f.path.replace(/\\/g, "/").split("/")[1] || "root", radius: 8 + Math.sqrt(imports.length) * 4 }
      nodeMap[f.path] = node
      return node
    })
    const l = []
    n.forEach(node => {
      node.imports.forEach(imp => {
        const clean  = imp.replace(/\\/g, "/")
        const target = Object.keys(nodeMap).find(p => p.replace(/\\/g, "/").includes(clean))
        if (target) l.push({ source: node.id, target })
      })
    })
    setNodes(n); setLinks(l)

    // Cycle detection with proper visited + stackSet (#2 reuse)
    const visited = new Set(), stackSet = new Set(), edges = new Set()
    const dfs = id => {
      if (stackSet.has(id)) return true
      if (visited.has(id))  return false
      visited.add(id); stackSet.add(id)
      l.forEach(e => { if (e.source === id && dfs(e.target)) edges.add(`${e.source}->${e.target}`) })
      stackSet.delete(id); return false
    }
    n.forEach(nd => dfs(nd.id))
    setCycleEdges(edges)
  }, [files])

  // Simulation — RAF stops when alpha is low (#3)
  useEffect(() => {
    if (!nodes.length) return
    const groups = {}
    nodes.forEach(n => { if (!groups[n.group]) groups[n.group] = { x: Math.random() * width, y: Math.random() * height } })

    const sim = forceSimulation(nodes)
      .force("charge",    forceManyBody().strength(-120))
      .force("link",      forceLink(links).id(d => d.id).distance(90))
      .force("center",    forceCenter(width / 2, height / 2))
      .force("collision", forceCollide().radius(d => d.radius + 5))
      .force("clusterX",  forceX(d => groups[d.group].x).strength(0.08))
      .force("clusterY",  forceY(d => groups[d.group].y).strength(0.08))
      .alphaDecay(0.06).velocityDecay(0.5)
    simRef.current = sim

    const render = () => {
      setNodes(prev => [...prev])
      // Only keep ticking while simulation is still active
      if (sim.alpha() > sim.alphaMin()) {
        rafRef.current = requestAnimationFrame(render)
      }
    }
    rafRef.current = requestAnimationFrame(render)

    return () => {
      sim.stop()
      cancelAnimationFrame(rafRef.current)
    }
  }, [links])

  const buildTree = useCallback((startId) => {
    const vis = new Set()
    const dfs = id => {
      vis.add(id)
      links.forEach(l => {
        const s = typeof l.source === "object" ? l.source.id : l.source
        const t = typeof l.target === "object" ? l.target.id : l.target
        if (s === id && !vis.has(t)) dfs(t)
      })
    }
    dfs(startId); setTreeNodes(vis)
  }, [links])

  useEffect(() => {
    if (!highlightedFile) return
    const node = nodes.find(n => n.id === highlightedFile.path)
    if (!node) return
    setTransform({ x: width / 2 - node.x, y: height / 2 - node.y, k: 1.2 })
    buildTree(node.id); setFocused(node)
  }, [highlightedFile, nodes, buildTree, width, height])

  const cycleSet = new Set()
  if (activeCycle?.length) {
    for (let i = 0; i < activeCycle.length; i++) {
      cycleSet.add(`${activeCycle[i]}->${activeCycle[(i + 1) % activeCycle.length]}`)
    }
  }

  const onWheel = useCallback(e => {
    e.preventDefault()
    const k = Math.max(0.3, Math.min(3, 1))
    setTransform(t => ({ ...t, k: Math.max(0.3, Math.min(3, t.k - e.deltaY * 0.001)) }))
  }, [])

  const onPanStart = useCallback(e => {
    const sx = e.clientX, sy = e.clientY
    const move = ev => setTransform(t => ({ ...t, x: t.x + (ev.clientX - sx), y: t.y + (ev.clientY - sy) }))
    const up   = ()  => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up) }
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up)
  }, [])

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: T.surfaceAlt }}>
      <div style={{ flexShrink: 0 }}><GraphSearch /></div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <svg width={width} height={height} onWheel={onWheel} onMouseDown={onPanStart}
          style={{ background: T.surfaceAlt, cursor: "grab", display: "block" }}>
          <defs>
            <marker id="arr"       markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 Z" fill={T.borderHover} /></marker>
            <marker id="arr-cycle" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 Z" fill={T.red} /></marker>
          </defs>
          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
            {links.map((l, i) => {
              const s = typeof l.source === "object" ? l.source : nodes.find(n => n.id === l.source)
              const t = typeof l.target === "object" ? l.target : nodes.find(n => n.id === l.target)
              if (!s || !t) return null
              const key     = `${s.id || s}->${t.id || t}`
              const isCycle = cycleEdges.has(key) || cycleSet.has(key)
              const visible = hoveredNode
                ? (s.id === hoveredNode.id || t.id === hoveredNode.id)
                : (!highlightedFile || treeNodes.has(s.id))
              return (
                <line key={`${key}-${i}`} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={isCycle ? T.red : T.borderHover} strokeWidth={isCycle ? 2 : 1.5}
                  strokeOpacity={visible ? 0.8 : 0.07}
                  markerEnd={isCycle ? "url(#arr-cycle)" : "url(#arr)"} />
              )
            })}
            {nodes.map((n, idx) => {
              const isHit    = highlightedFile?.path === n.id
              const isUnused = (n.file?._meta?.incoming || 0) === 0
              const visible  = hoveredNode
                ? n.id === hoveredNode.id || links.some(l => {
                    const s = typeof l.source === "object" ? l.source.id : l.source
                    const t = typeof l.target === "object" ? l.target.id : l.target
                    return (s === hoveredNode.id && t === n.id) || (t === hoveredNode.id && s === n.id)
                  })
                : isHit || (!highlightedFile && (!focused || treeNodes.has(n.id))) || (highlightedFile && treeNodes.has(n.id))
              return (
                <g key={`${n.id}-${idx}`}>
                  {isHit && <circle cx={n.x} cy={n.y} r={n.radius + 5} fill="none" stroke={T.brand} strokeWidth={2} opacity={0.7} />}
                  <circle cx={n.x} cy={n.y} r={n.radius} fill={nodeColor(n.stress)} opacity={visible ? 1 : 0.1}
                    stroke={isUnused ? "#8b5cf6" : "none"} strokeWidth={isUnused ? 2 : 0}
                    style={{ cursor: "pointer" }}
                    onClick={() => { setFocused(n); buildTree(n.id); selectFile(n.file) }}
                    onMouseEnter={() => setHoveredNode(n)}
                    onMouseLeave={() => setHoveredNode(null)} />
                  {n.radius > 10 && (
                    <text x={n.x + n.radius + 3} y={n.y + 4} fontSize={10} fill={T.textSub} style={{ pointerEvents: "none", userSelect: "none" }}>
                      {(n.file.path || "").replace(/\\/g, "/").split("/").pop()}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        <svg width={150} height={90} style={{ position: "absolute", bottom: 10, right: 10, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r }}>
          {nodes.map((n, i) => (
            <circle key={i} cx={Math.max(2, Math.min(148, n.x * 0.13))} cy={Math.max(2, Math.min(88, n.y * 0.13))} r={2} fill={nodeColor(n.stress)} opacity={0.75} />
          ))}
        </svg>

        <div style={{ position: "absolute", bottom: 10, left: 10, fontSize: 9, fontFamily: "monospace", color: T.textHint, background: T.surface, border: `1px solid ${T.border}`, padding: "3px 8px", borderRadius: T.r }}>
          {Math.round(transform.k * 100)}%
        </div>
      </div>
    </div>
  )
}