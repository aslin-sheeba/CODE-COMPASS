import React, { useEffect, useRef, useState } from "react"
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  forceX,
  forceY
} from "d3-force"
import { useProjectStore } from "../state/projectStore"

// ─── GRAPH SEARCH (inline, dark themed) ──────────────────────────────────────
function GraphSearch() {
  const { files, setHighlightedFile } = useProjectStore()
  const [query,   setQuery]   = React.useState("")
  const [results, setResults] = React.useState([])

  React.useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setResults(
      files
        .filter(f => f.path.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
    )
  }, [query, files])

  return (
    <div style={{ position: "relative" }}>
      <input
        placeholder="🔎 Search in graph..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{
          width: "100%", padding: "8px 12px",
          background: "#111620", border: "1px solid #1e2535",
          color: "#e8edf5", fontFamily: "monospace",
          fontSize: 12, outline: "none",
          boxSizing: "border-box"
        }}
      />
      {results.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "#111620", border: "1px solid #1e2535",
          zIndex: 20, maxHeight: 200, overflowY: "auto"
        }}>
          {results.map((f, i) => (
            <div key={i}
              onClick={() => {
                setHighlightedFile(f)
                setQuery("")
                setResults([])
              }}
              style={{
                padding: "7px 12px", cursor: "pointer",
                fontSize: 11, color: "#8a95b0",
                fontFamily: "monospace",
                borderBottom: "1px solid #0e1117"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#1a2235"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {f.path.replace(/\\/g, "/").split("/").pop()}
              <span style={{ color: "#2e3d5a", marginLeft: 8, fontSize: 9 }}>
                {f.path}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MAIN GRAPH ───────────────────────────────────────────────────────────────
export default function ModuleGraph({ width = 1000, height = 600, activeCycle }) {
  const { files, selectFile, highlightedFile } = useProjectStore()

  const svgRef  = useRef()
  const simRef  = useRef()

  const [nodes,       setNodes]       = useState([])
  const [links,       setLinks]       = useState([])
  const [focused,     setFocused]     = useState(null)
  const [treeNodes,   setTreeNodes]   = useState(new Set())
  const [cycles,      setCycles]      = useState(new Set())
  const [hoveredNode, setHoveredNode] = useState(null)
  const [transform,   setTransform]   = useState({ x: 0, y: 0, k: 1 })

  // ── BUILD GRAPH ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const nodeMap = {}

    const n = files.map(f => {
      const imports = f.imports || []
      const node = {
        id:      f.path,
        file:    f,
        imports,
        stress:  f.metrics?.risk || f._meta?.stressScore || 0,
        group:   f.path.replace(/\\/g, "/").split("/")[1] || "root",
        radius:  8 + Math.sqrt(imports.length) * 4
      }
      nodeMap[f.path] = node
      return node
    })

    const l = []
    n.forEach(node => {
      node.imports.forEach(imp => {
        const cleanImp = imp.replace(/\\/g, "/")
        const target   = Object.keys(nodeMap).find(p =>
          p.replace(/\\/g, "/").includes(cleanImp)
        )
        if (target) l.push({ source: node.id, target })
      })
    })

    setNodes(n)
    setLinks(l)

    // Detect cycles
    const visited    = new Set()
    const stack      = new Set()
    const cycleEdges = new Set()

    const dfs = (nodeId) => {
      if (stack.has(nodeId))   return true
      if (visited.has(nodeId)) return false
      visited.add(nodeId)
      stack.add(nodeId)
      l.forEach(edge => {
        if (edge.source === nodeId && dfs(edge.target)) {
          cycleEdges.add(edge.source + "->" + edge.target)
        }
      })
      stack.delete(nodeId)
      return false
    }
    n.forEach(nd => dfs(nd.id))
    setCycles(cycleEdges)

  }, [files])

  // ── SIMULATION ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!nodes.length) return

    const groups = {}
    nodes.forEach(n => {
      if (!groups[n.group]) {
        groups[n.group] = {
          x: Math.random() * width,
          y: Math.random() * height
        }
      }
    })

    const sim = forceSimulation(nodes)
      .force("charge",    forceManyBody().strength(-120))
      .force("link",      forceLink(links).id(d => d.id).distance(90))
      .force("center",    forceCenter(width / 2, height / 2))
      .force("collision", forceCollide().radius(d => d.radius + 5))
      .force("clusterX",  forceX(d => groups[d.group].x).strength(0.08))
      .force("clusterY",  forceY(d => groups[d.group].y).strength(0.08))
      .alphaDecay(0.06)
      .velocityDecay(0.5)

    simRef.current = sim

    let raf
    const render = () => {
      setNodes([...nodes])
      raf = requestAnimationFrame(render)
    }
    render()

    return () => { sim.stop(); cancelAnimationFrame(raf) }
  }, [links])

  // ── BUILD DEP TREE ──────────────────────────────────────────────────────────
  const buildTree = (startId) => {
    const visited = new Set()
    const dfs = (id) => {
      visited.add(id)
      links.forEach(l => {
        const sId = typeof l.source === "object" ? l.source.id : l.source
        const tId = typeof l.target === "object" ? l.target.id : l.target
        if (sId === id && !visited.has(tId)) dfs(tId)
      })
    }
    dfs(startId)
    setTreeNodes(visited)
  }

  // Auto-focus on search hit
  React.useEffect(() => {
    if (!highlightedFile) return
    const node = nodes.find(n => n.id === highlightedFile.path)
    if (!node) return
    setTransform({ x: width / 2 - node.x, y: height / 2 - node.y, k: 1.2 })
    buildTree(node.id)
    setFocused(node)
  }, [highlightedFile])

  // ── NODE COLOR ──────────────────────────────────────────────────────────────
  const getColor = (s) => {
    if (s > 20) return "#ff4444"
    if (s > 10) return "#ffb300"
    return "#00e676"
  }

  // Active cycle edges
  const cycleSet = new Set()
  if (activeCycle?.length) {
    for (let i = 0; i < activeCycle.length; i++) {
      const a = activeCycle[i]
      const b = activeCycle[(i + 1) % activeCycle.length]
      cycleSet.add(a + "->" + b)
    }
  }

  // ── ZOOM + PAN ──────────────────────────────────────────────────────────────
  const onWheel = (e) => {
    e.preventDefault()
    const scale = Math.max(0.3, Math.min(3, transform.k - e.deltaY * 0.001))
    setTransform(t => ({ ...t, k: scale }))
  }

  const onPanStart = (e) => {
    const startX = e.clientX
    const startY = e.clientY
    const move = (ev) => {
      setTransform(t => ({
        ...t,
        x: t.x + (ev.clientX - startX),
        y: t.y + (ev.clientY - startY)
      }))
    }
    const up = () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseup", up)
    }
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up)
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      width: "100%", height: "100%",
      background: "#0e1117"
    }}>

      {/* Search bar */}
      <div style={{ flexShrink: 0, borderBottom: "1px solid #1e2535" }}>
        <GraphSearch />
      </div>

      {/* Graph SVG */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          onWheel={onWheel}
          onMouseDown={onPanStart}
          style={{ background: "#0e1117", cursor: "grab", display: "block" }}
        >
          <defs>
            <marker
              id="arrow" markerWidth="6" markerHeight="6"
              refX="4" refY="3" orient="auto"
            >
              <path d="M0,0 L0,6 L6,3 Z" fill="#2e3d5a" />
            </marker>
            <marker
              id="arrow-cycle" markerWidth="6" markerHeight="6"
              refX="4" refY="3" orient="auto"
            >
              <path d="M0,0 L0,6 L6,3 Z" fill="#ff4444" />
            </marker>
          </defs>

          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>

            {/* EDGES */}
            {links.map((l, i) => {
              const source = typeof l.source === "object"
                ? l.source : nodes.find(n => n.id === l.source)
              const target = typeof l.target === "object"
                ? l.target : nodes.find(n => n.id === l.target)

              if (!source || !target) return null

              const key = (source.id || source) + "->" + (target.id || target)
              const isCycleEdge = cycles.has(key) || cycleSet.has(key)

              const edgeVisible = hoveredNode
                ? source.id === hoveredNode.id || target.id === hoveredNode.id
                : !highlightedFile || treeNodes.has(source.id)

              return (
                <line
                  key={`${key}-${i}`}
                  x1={source.x} y1={source.y}
                  x2={target.x} y2={target.y}
                  stroke={isCycleEdge ? "#ff4444" : "#2e3d5a"}
                  strokeWidth={isCycleEdge ? 2 : 1.5}
                  strokeOpacity={edgeVisible ? 0.8 : 0.08}
                  markerEnd={isCycleEdge ? "url(#arrow-cycle)" : "url(#arrow)"}
                />
              )
            })}

            {/* NODES */}
            {nodes.map((n, idx) => {
              const isSearchHit = highlightedFile?.path === n.id
              const isUnused    = n.file?.metrics?.fanIn === 0 ||
                                  n.file?._meta?.incoming === 0

              let visible
              if (hoveredNode) {
                visible = n.id === hoveredNode.id ||
                  links.some(l => {
                    const sId = typeof l.source === "object" ? l.source.id : l.source
                    const tId = typeof l.target === "object" ? l.target.id : l.target
                    return (sId === hoveredNode.id && tId === n.id) ||
                           (tId === hoveredNode.id && sId === n.id)
                  })
              } else {
                visible = isSearchHit ||
                  (!highlightedFile && (!focused || treeNodes.has(n.id))) ||
                  (highlightedFile && treeNodes.has(n.id))
              }

              const nodeColor = getColor(n.stress)

              return (
                <g key={`${n.id}-${idx}`}>
                  {/* Glow ring for selected */}
                  {isSearchHit && (
                    <circle
                      cx={n.x} cy={n.y} r={n.radius + 5}
                      fill="none" stroke="#00e5ff"
                      strokeWidth={2} opacity={0.6}
                    />
                  )}

                  <circle
                    cx={n.x} cy={n.y} r={n.radius}
                    fill={nodeColor}
                    opacity={visible ? 1 : 0.12}
                    stroke={isUnused ? "#9c6fff" : "none"}
                    strokeWidth={isUnused ? 2 : 0}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setFocused(n)
                      buildTree(n.id)
                      selectFile(n.file)
                    }}
                    onMouseEnter={() => setHoveredNode(n)}
                    onMouseLeave={() => setHoveredNode(null)}
                  />

                  {/* Label — only for larger nodes */}
                  {n.radius > 10 && (
                    <text
                      x={n.x + n.radius + 3}
                      y={n.y + 4}
                      fontSize={10}
                      fill="#8a95b0"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {(n.file.path || "").replace(/\\/g, "/").split("/").pop()}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* MINIMAP */}
        <svg
          width={160} height={100}
          style={{
            position: "absolute", bottom: 10, right: 10,
            background: "#111620", border: "1px solid #1e2535",
            borderRadius: 4
          }}
        >
          {nodes.map((n, i) => (
            <circle
              key={i}
              cx={Math.max(2, Math.min(158, n.x * 0.14))}
              cy={Math.max(2, Math.min(98,  n.y * 0.14))}
              r={2}
              fill={getColor(n.stress)}
              opacity={0.7}
            />
          ))}
        </svg>

        {/* ZOOM indicator */}
        <div style={{
          position: "absolute", bottom: 10, left: 10,
          fontSize: 9, fontFamily: "monospace",
          color: "#2e3d5a",
          background: "#111620",
          border: "1px solid #1e2535",
          padding: "3px 8px", borderRadius: 4
        }}>
          {Math.round(transform.k * 100)}%
        </div>
      </div>
    </div>
  )
}
