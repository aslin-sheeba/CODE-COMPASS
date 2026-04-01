import React from "react"
import { useProjectStore } from "../../state/projectStore"
import { T } from "../../theme"

function getExtColor(path) {
  const ext = (path.match(/\.(\w+)$/) || [])[1] || "other"
  const map = {
    tsx: T.teal, ts: T.blue, jsx: T.teal,
    js:  T.orange, css: "#8b5cf6", json: T.green,
    md:  T.orange, html: T.red
  }
  return map[ext] || T.textHint
}

function getFileName(path) {
  return (path || "").replace(/\\/g, "/").split("/").pop()
}

function getStressDot(score) {
  if (score > 15) return T.red
  if (score > 8)  return T.orange
  return T.teal
}

// Build a tree structure from flat file list
function buildTree(files) {
  const tree = {}
  for (const file of files) {
    const parts = file.path.replace(/\\/g, "/").split("/")
    let node = tree
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]]) node[parts[i]] = { __files: [], __dirs: {} }
      node = node[parts[i]].__dirs
    }
    const fname = parts[parts.length - 1]
    const parent = parts.slice(0, -1)
    const key = parent.join("/")
    if (!tree.__flat) tree.__flat = []
    tree.__flat.push({ file, folder: key })
  }
  return tree
}

// Group files by top-level folder segment
function groupByFolder(files) {
  const groups = {}
  const roots  = []
  for (const file of files) {
    const parts = file.path.replace(/\\/g, "/").split("/")
    if (parts.length === 1) {
      roots.push(file)
    } else {
      const folder = parts[0]
      if (!groups[folder]) groups[folder] = []
      groups[folder].push(file)
    }
  }
  return { groups, roots }
}

function FileRow({ file, depth = 0, isSelected, onClick }) {
  const [hov, setHov] = React.useState(false)
  const name   = getFileName(file.path)
  const color  = getExtColor(file.path)
  const dot    = getStressDot(file._meta?.stressScore || 0)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: `4px 12px 4px ${14 + depth * 14}px`,
        cursor: "pointer",
        background: isSelected ? T.brandLight : hov ? T.surfaceAlt : "transparent",
        borderLeft: isSelected ? `2px solid ${T.brand}` : "2px solid transparent",
        transition: "all 0.1s",
      }}
    >
      <div style={{
        width: 7, height: 7, borderRadius: 2,
        background: dot, flexShrink: 0
      }} />
      <span style={{
        fontSize: 11.5, color: isSelected ? T.brand : T.text,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        flex: 1
      }}>
        {name}
      </span>
    </div>
  )
}

function FolderRow({ name, depth = 0, expanded, onClick }) {
  const [hov, setHov] = React.useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: `5px 12px 5px ${12 + depth * 14}px`,
        cursor: "pointer",
        background: hov ? T.surfaceAlt : "transparent",
        color: T.textSub, fontSize: 11.5,
        transition: "background 0.1s",
      }}
    >
      <span style={{ fontSize: 10, color: T.textHint, width: 10, flexShrink: 0 }}>
        {expanded ? "▾" : "▸"}
      </span>
      <span>{name}/</span>
    </div>
  )
}

export default function FileExplorer() {
  const { files, selectedFile, selectFile } = useProjectStore()
  const [expanded, setExpanded] = React.useState({})

  React.useEffect(() => {
    // Auto-expand all folders
    const init = {}
    for (const file of files) {
      const parts = file.path.replace(/\\/g, "/").split("/")
      for (let i = 1; i < parts.length; i++) {
        init[parts.slice(0, i).join("/")] = true
      }
    }
    setExpanded(init)
  }, [files.length])

  if (!files.length) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.textHint, fontSize: 11 }}>
      no project loaded
    </div>
  )

  // Group into folders
  const { groups, roots } = groupByFolder(files)

  function toggleFolder(key) {
    setExpanded(e => ({ ...e, [key]: !e[key] }))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "8px 14px 6px",
        fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
        color: T.textHint, fontWeight: 600,
        borderBottom: `1px solid ${T.border}`, flexShrink: 0
      }}>
        explorer
      </div>

      {/* File tree */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        {/* Root files */}
        {roots.map(file => (
          <FileRow
            key={file.path}
            file={file}
            depth={0}
            isSelected={selectedFile?.path === file.path}
            onClick={() => selectFile(file)}
          />
        ))}

        {/* Folders */}
        {Object.entries(groups).map(([folder, folderFiles]) => {
          const isOpen = expanded[folder] !== false
          return (
            <div key={folder}>
              <FolderRow
                name={folder}
                depth={0}
                expanded={isOpen}
                onClick={() => toggleFolder(folder)}
              />
              {isOpen && folderFiles.map(file => {
                // compute sub-depth
                const parts = file.path.replace(/\\/g, "/").split("/")
                const depth = parts.length - 2
                return (
                  <FileRow
                    key={file.path}
                    file={file}
                    depth={Math.max(1, depth)}
                    isSelected={selectedFile?.path === file.path}
                    onClick={() => selectFile(file)}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}