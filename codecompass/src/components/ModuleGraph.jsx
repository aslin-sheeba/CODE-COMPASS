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
import GraphSearch from "./GraphSearch"

export default function ModuleGraph({ width = 1000, height = 650, activeCycle }) {
  const { files, selectFile, highlightedFile } = useProjectStore()

  const svgRef = useRef()
  const simRef = useRef()

  const [nodes, setNodes] = useState([])
  const [links, setLinks] = useState([])
  const [focused, setFocused] = useState(null)
  const [treeNodes, setTreeNodes] = useState(new Set())
  const [cycles, setCycles] = useState(new Set())
  const [hoveredNode, setHoveredNode] = useState(null)
  // 🔥 BUILD GRAPH
  useEffect(() => {
    const nodeMap = {}

    const n = files.map(f => {
      const imports = f.imports || []

      const node = {
        id: f.path,
        file: f,
        imports,
        stress: f.metrics?.risk || 0,
        group: f.path.split("/")[1] || "root",
        radius: 6 + Math.sqrt(imports.length) * 5
      }

      nodeMap[f.path] = node
      return node
    })

    const l = []
    n.forEach(node => {
      node.imports.forEach(imp => {
  const cleanImp = imp.replace(/\\/g, "/")

  const target = Object.keys(nodeMap).find(p =>
    p.replace(/\\/g, "/").includes(cleanImp)
  )

  if (target) {
    l.push({ source: node.id, target })
  }
})
    })

    setNodes(n)
    setLinks(l)

    // 🔁 Detect cycles
    const visited = new Set()
    const stack = new Set()
    const cycleEdges = new Set()

    const dfs = (nodeId) => {
      if (stack.has(nodeId)) return true
      if (visited.has(nodeId)) return false

      visited.add(nodeId)
      stack.add(nodeId)

      l.forEach(edge => {
        if (edge.source === nodeId) {
          if (dfs(edge.target)) {
            cycleEdges.add(edge.source + "->" + edge.target)
          }
        }
      })

      stack.delete(nodeId)
      return false
    }

    n.forEach(n => dfs(n.id))
    setCycles(cycleEdges)

  }, [files])

  // 🚀 SIMULATION
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
      .force("charge", forceManyBody().strength(-120))
      .force("link", forceLink(links).id(d => d.id).distance(90))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collision", forceCollide().radius(d => d.radius + 5))
      .force("clusterX", forceX(d => groups[d.group].x).strength(0.08))
      .force("clusterY", forceY(d => groups[d.group].y).strength(0.08))
      .alphaDecay(0.06)
      .velocityDecay(0.5)

    simRef.current = sim

    let raf
    const render = () => {
      setNodes([...nodes])
      raf = requestAnimationFrame(render)
    }
    render()

    return () => {
      sim.stop()
      cancelAnimationFrame(raf)
    }
  }, [links])

  // 🎯 BUILD FULL DEP TREE

    const buildTree = (startId) => {
    const visited = new Set()

    const dfs = (id) => {
      visited.add(id)
      links.forEach(l => {
        if (l.source.id === id && !visited.has(l.target.id)) {
          dfs(l.target.id)
        }
      })
    }

    dfs(startId)
    setTreeNodes(visited)
  }

  // Auto-focus when a search highlights a file
  React.useEffect(() => {
    if (!highlightedFile) return

    const node = nodes.find(n => n.id === highlightedFile.path)
    if (!node) return

    setTransform({
      x: width / 2 - node.x,
      y: height / 2 - node.y,
      k: 1.2
    })

    buildTree(node.id)
    setFocused(node)
  }, [highlightedFile])

  // 🎨 COLOR
  const getColor = (s) => {
    if (s > 20) return "#ff4d4f"
    if (s > 10) return "#faad14"
    return "#52c41a"
  }

  const isUnused = (node) => {
    return (node && node.file && node.file.metrics && node.file.metrics.fanIn === 0)
  }

  // build set of edges for the active cycle (if any)
  const cycleSet = new Set()
  if (activeCycle && activeCycle.length) {
    for (let i = 0; i < activeCycle.length; i++) {
      const a = activeCycle[i]
      const b = activeCycle[(i + 1) % activeCycle.length]
      cycleSet.add(a + "->" + b)
    }
  }

  // 🔎 ZOOM + PAN
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })

  const onWheel = (e) => {
    e.preventDefault()
    const scale = Math.max(0.5, Math.min(2, transform.k - e.deltaY * 0.001))
    setTransform({ ...transform, k: scale })
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

  return (
    <div style={{ position: "relative" }}>

      {/* 📊 METRICS PANEL */}
      <div style={{
        position: "absolute",
        top: 10,
        right: 10,
        background: "#fff",
        padding: 10,
        fontSize: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <div>Nodes: {nodes.length}</div>
        <div>Links: {links.length}</div>
        <div>Cycles: {cycles.size}</div>
        <div>High Stress: {nodes.filter(n => n.stress > 10).length}</div>
      </div>

      {/* MAIN GRAPH */}
      <div style={{ marginBottom: 10 }}>
        <GraphSearch />
      </div>

          <svg
            ref={svgRef}
            width={width}
            height={height}
            onWheel={onWheel}
            onMouseDown={onPanStart}
            style={{ background: "#f9fafb", cursor: "grab" }}
          >
            <defs>
              <marker
                    id="arrow"
                    markerWidth="6"
                    markerHeight="6"
                    refX="4"
                    refY="3"
                    orient="auto"
                  >
              <path d="M0,0 L0,6 L6,3 Z" fill="#555" />
            </marker>
                
            </defs>
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>

          {/* EDGES */}
          {links.map((l, i) => {
            // resolve source/target to node objects (d3 may replace ids)
            const source = typeof l.source === 'object' ? l.source : nodes.find(n => n.id === l.source)
            const target = typeof l.target === 'object' ? l.target : nodes.find(n => n.id === l.target)

            if (!source || !target) return null

            const key = (source.id || source) + "->" + (target.id || target)
            let isCycleEdge = cycles.has(key)
            if (cycleSet.size) {
              isCycleEdge = cycleSet.has(key)
            }

            const edgeVisible = !hoveredNode
              ? (!highlightedFile || treeNodes.has(source.id))
              : source.id === hoveredNode.id || target.id === hoveredNode.id

            return (
            <line
              key={key}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={isCycleEdge ? '#ff6666' : '#555'}
              strokeWidth={1.5}
              strokeOpacity={edgeVisible ? 1 : 0.15}
              markerEnd="url(#arrow)"
            />
            )
          })}

          {/* NODES */}
          {nodes.map(n => {
            const isSearchHit = highlightedFile?.path === n.id

            let visible
            if (hoveredNode) {
              visible =
                n.id === hoveredNode.id ||
                links.some(l => {
                  const sId = typeof l.source === 'object' ? l.source.id : l.source
                  const tId = typeof l.target === 'object' ? l.target.id : l.target
                  return (
                    (sId === hoveredNode.id && tId === n.id) ||
                    (tId === hoveredNode.id && sId === n.id)
                  )
                })
            } else {
              visible =
                isSearchHit ||
                (!highlightedFile && (!focused || treeNodes.has(n.id))) ||
                (highlightedFile && treeNodes.has(n.id))
            }

            return (
              <g key={n.id}>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.radius}
                  fill={getColor(n.stress)}
                  opacity={visible ? 1 : 0.2}

                  stroke={isSearchHit ? "#000" : isUnused(n) ? "#000" : "none"}
                  strokeWidth={isSearchHit ? 3 : isUnused(n) ? 2 : 0}

                  onClick={() => {
                    setFocused(n)
                    buildTree(n.id)
                    selectFile(n.file)
                  }}
                  onMouseEnter={() => setHoveredNode(n)}
                  onMouseLeave={() => setHoveredNode(null)}
                />

                {n.radius > 10 && (
                  <text x={n.x + n.radius} y={n.y} fontSize={10}>
                    {n.file.path.split("/").pop()}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* 🧭 MINI MAP */}
      <svg
        width={200}
        height={120}
        style={{
          position: "absolute",
          bottom: 10,
          right: 10,
          background: "#fff",
          border: "1px solid #ddd"
        }}
      >
        {nodes.map((n, i) => (
          <circle
            key={i}
            cx={n.x * 0.2}
            cy={n.y * 0.2}
            r={2}
            fill="#555"
          />
        ))}
      </svg>

    </div>
  )
}

