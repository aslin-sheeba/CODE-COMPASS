import React from "react"
import { useProjectStore } from "../../state/projectStore"
import { T } from "../../theme"
import { getExtColor, getStressDot, basename } from "../../utils"

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
  const name  = basename(file.path)
  const dot   = getStressDot(file._meta?.stressScore || 0)

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
      <div style={{ width: 7, height: 7, borderRadius: 2, background: dot, flexShrink: 0 }} />
      <span style={{ fontSize: 11.5, color: isSelected ? T.brand : T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
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

  const { groups, roots } = groupByFolder(files)

  const toggleFolder = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "8px 14px 6px", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, fontWeight: 600, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        explorer
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        {roots.map(file => (
          <FileRow key={file.path} file={file} depth={0} isSelected={selectedFile?.path === file.path} onClick={() => selectFile(file)} />
        ))}

        {Object.entries(groups).map(([folder, folderFiles]) => {
          const isOpen = expanded[folder] !== false
          return (
            <div key={folder}>
              <FolderRow name={folder} depth={0} expanded={isOpen} onClick={() => toggleFolder(folder)} />
              {isOpen && folderFiles.map(file => {
                const depth = Math.max(1, file.path.replace(/\\/g, "/").split("/").length - 2)
                return (
                  <FileRow key={file.path} file={file} depth={depth} isSelected={selectedFile?.path === file.path} onClick={() => selectFile(file)} />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}