import React from "react"

// ─── DATA ─────────────────────────────────────────────────────────────────────
const TRACKS = [
  {
    id: "setup",
    label: "Environment Setup",
    icon: "⚡",
    color: "#00e5ff",
    desc: "Get your machine ready to run the project",
    items: [
      { id: "clone",    text: "Clone the repository",                     est: "2 min",  note: "git clone https://github.com/your-org/codecompass.git" },
      { id: "install",  text: "Run npm install in /app and /server",      est: "5 min",  note: "Run separately: cd app && npm install, then cd ../server && npm install" },
      { id: "env",      text: "Configure .env with MongoDB URI and keys", est: "3 min",  note: "Copy .env.example to .env — ask your team lead for the MongoDB URI and API keys" },
      { id: "devrun",   text: "Start dev server with npm start",          est: "1 min",  note: "Run from root: npm start — this runs Vite + Electron concurrently" },
      { id: "electron", text: "Confirm Electron window opens correctly",  est: "1 min",  note: "You should see the CodeCompass window. If blank, check the console for errors" },
    ]
  },
  {
    id: "codebase",
    label: "Codebase Orientation",
    icon: "🗺️",
    color: "#9c6fff",
    desc: "Understand how the project is structured",
    items: [
      { id: "structure", text: "Review top-level folder structure",         est: "10 min", note: "Key folders: /app (React+Electron frontend), /server (Express backend), /electron (IPC handlers)" },
      { id: "store",     text: "Read state/projectStore.js — global state", est: "10 min", note: "Zustand store — holds files[], selectedFile, highlightedFile. All pages read from here" },
      { id: "ipc",       text: "Trace Electron IPC flow: preload → main",   est: "15 min", note: "Flow: React calls window.electronAPI → preload.js exposes via contextBridge → ipcMain.handle in projectIPC.js" },
      { id: "scanner",   text: "Read scanProject.js and parseImports.js",   est: "10 min", note: "scanProject walks the directory tree. parseImports extracts ES6 import statements with regex" },
      { id: "services",  text: "Read all services (risk, search, unused)",  est: "15 min", note: "riskService computes fan-in/out. searchService builds in-memory index. unusedService detects orphaned files" },
      { id: "pages",     text: "Skim each page component",                  est: "20 min", note: "Start with Dashboard.jsx, then Architecture.jsx. All pages use useProjectStore() for data" },
    ]
  },
  {
    id: "architecture",
    label: "Architecture Deep Dive",
    icon: "🏗️",
    color: "#ffb300",
    desc: "Understand key design decisions",
    items: [
      { id: "graph",  text: "Run the app and import a real project",  est: "5 min",  note: "Click Import Project in the topbar — try importing the CodeCompass repo itself" },
      { id: "stress", text: "Identify the 3 highest stress files",    est: "10 min", note: "Sort the FileExplorer by stress. High stress = many imports + many files depend on it" },
      { id: "cycles", text: "Find any circular dependency cycles",    est: "10 min", note: "Red edges in the ModuleGraph indicate circular dependencies. Check CyclePanel for a list" },
      { id: "unused", text: "Review the unused files panel",          est: "5 min",  note: "Unused = files with zero fan-in (nothing imports them). They may be dead code or entry points" },
    ]
  },
  {
    id: "contribute",
    label: "First Contribution",
    icon: "🚀",
    color: "#00e676",
    desc: "Make your first change to the codebase",
    items: [
      { id: "issue",     text: "Pick an open issue or task from backlog", est: "10 min", note: "Check the GitHub Issues tab. Good first issues are labeled 'good first issue'" },
      { id: "branch",    text: "Create a feature branch",                 est: "2 min",  note: "git checkout -b feature/your-feature-name — use kebab-case, prefix with feature/ or fix/" },
      { id: "implement", text: "Implement the change with tests",         est: "varies", note: "Keep changes focused. One PR = one concern. Test your change by importing a project in the app" },
      { id: "pr",        text: "Open a pull request for review",          est: "10 min", note: "Fill in the PR template. Link the issue number. Request review from your team lead" },
    ]
  },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getAllItems() {
  return TRACKS.flatMap(t => t.items.map(i => i.id))
}

// ─── EXPORT HELPERS ───────────────────────────────────────────────────────────
function buildMarkdown(name, role, startDate, checked) {
  const allItems = getAllItems()
  const done     = allItems.filter(id => checked[id]).length
  const pct      = Math.round((done / allItems.length) * 100)

  const lines = []
  lines.push(`# CodeCompass — Onboarding Checklist`)
  lines.push(``)
  lines.push(`**Developer:** ${name}`)
  lines.push(`**Role:** ${role}`)
  lines.push(`**Start Date:** ${startDate}`)
  lines.push(`**Progress:** ${pct}% (${done}/${allItems.length} tasks)`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  TRACKS.forEach(track => {
    const tDone = track.items.filter(i => checked[i.id]).length
    lines.push(`## ${track.icon} ${track.label} (${tDone}/${track.items.length})`)
    lines.push(`*${track.desc}*`)
    lines.push(``)
    track.items.forEach(item => {
      const tick = checked[item.id] ? "x" : " "
      lines.push(`- [${tick}] **${item.text}** *(${item.est})*`)
      lines.push(`  > 💡 ${item.note}`)
    })
    lines.push(``)
  })

  lines.push(`---`)
  lines.push(`*Generated by CodeCompass on ${new Date().toLocaleString()}*`)

  return lines.join("\n")
}

function buildPlainText(name, role, startDate, checked) {
  const allItems = getAllItems()
  const done     = allItems.filter(id => checked[id]).length
  const pct      = Math.round((done / allItems.length) * 100)

  const lines = []
  lines.push(`CODECOMPASS — ONBOARDING CHECKLIST`)
  lines.push(`${"=".repeat(40)}`)
  lines.push(`Developer : ${name}`)
  lines.push(`Role      : ${role}`)
  lines.push(`Start Date: ${startDate}`)
  lines.push(`Progress  : ${pct}% (${done}/${allItems.length} tasks)`)
  lines.push(``)

  TRACKS.forEach(track => {
    const tDone = track.items.filter(i => checked[i.id]).length
    lines.push(`${track.icon} ${track.label.toUpperCase()} (${tDone}/${track.items.length})`)
    lines.push(`${"-".repeat(36)}`)
    track.items.forEach((item, idx) => {
      const tick = checked[item.id] ? "[✓]" : "[ ]"
      lines.push(`  ${tick} ${idx + 1}. ${item.text} (${item.est})`)
    })
    lines.push(``)
  })

  lines.push(`Generated by CodeCompass — ${new Date().toLocaleString()}`)
  return lines.join("\n")
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── EXPORT PANEL ─────────────────────────────────────────────────────────────
function ExportPanel({ name, role, startDate, checked }) {
  const [copied,   setCopied]   = React.useState(false)
  const [showMenu, setShowMenu] = React.useState(false)

  const handleCopy = () => {
    const text = buildPlainText(name, role, startDate, checked)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownloadMd = () => {
    const md = buildMarkdown(name, role, startDate, checked)
    const filename = `onboarding-${name.toLowerCase().replace(/\s+/g, "-")}.md`
    downloadFile(md, filename, "text/markdown")
    setShowMenu(false)
  }

  const handleDownloadTxt = () => {
    const txt = buildPlainText(name, role, startDate, checked)
    const filename = `onboarding-${name.toLowerCase().replace(/\s+/g, "-")}.txt`
    downloadFile(txt, filename, "text/plain")
    setShowMenu(false)
  }

  const handleReset = () => {
    setShowMenu(false)
    if (window.confirm("Reset all progress? This cannot be undone.")) {
      return true
    }
    return false
  }

  return (
    <div style={{
      background: "#111620", border: "1px solid #1e2535",
      borderRadius: 10, padding: "16px 20px",
      display: "flex", alignItems: "center",
      justifyContent: "space-between", marginBottom: 24
    }}>
      <div>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: "#e8edf5", marginBottom: 2
        }}>
          Export Checklist
        </div>
        <div style={{
          fontSize: 10, color: "#4a5570", fontFamily: "monospace"
        }}>
          share your progress or save for reference
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {/* Copy to clipboard */}
        <button onClick={handleCopy} style={{
          padding: "7px 14px", borderRadius: 6,
          border: "1px solid #1e2535",
          background: copied ? "#00e67618" : "transparent",
          color: copied ? "#00e676" : "#8a95b0",
          cursor: "pointer", fontSize: 11,
          fontFamily: "monospace", transition: "all 0.2s"
        }}>
          {copied ? "✓ Copied!" : "Copy Text"}
        </button>

        {/* Download markdown */}
        <button onClick={handleDownloadMd} style={{
          padding: "7px 14px", borderRadius: 6,
          border: "1px solid #9c6fff44",
          background: "#9c6fff18",
          color: "#9c6fff", cursor: "pointer",
          fontSize: 11, fontFamily: "monospace",
          transition: "all 0.15s"
        }}>
          ↓ Markdown
        </button>

        {/* Download txt */}
        <button onClick={handleDownloadTxt} style={{
          padding: "7px 14px", borderRadius: 6,
          border: "1px solid #00e5ff44",
          background: "#00e5ff18",
          color: "#00e5ff", cursor: "pointer",
          fontSize: 11, fontFamily: "monospace",
          transition: "all 0.15s"
        }}>
          ↓ Text File
        </button>
      </div>
    </div>
  )
}

// ─── PROFILE CARD ─────────────────────────────────────────────────────────────
function ProfileCard({ name, setName, role, setRole, startDate }) {
  const [editingName, setEditingName] = React.useState(false)
  const [editingRole, setEditingRole] = React.useState(false)

  const roles = [
    "Frontend Developer", "Backend Developer", "Full Stack Developer",
    "DevOps Engineer", "QA Engineer", "Tech Lead",
  ]

  return (
    <div style={{
      background: "#111620", border: "1px solid #1e2535",
      borderRadius: 10, padding: "20px 24px",
      display: "flex", alignItems: "center",
      gap: 20, marginBottom: 24
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: "#00e5ff18", border: "1px solid #00e5ff44",
        display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 20, flexShrink: 0
      }}>
        👤
      </div>
      <div style={{ flex: 1 }}>
        {editingName ? (
          <input autoFocus value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => e.key === "Enter" && setEditingName(false)}
            style={{
              background: "#0a0c0f", border: "1px solid #00e5ff44",
              borderRadius: 6, padding: "4px 10px",
              color: "#e8edf5", fontFamily: "monospace",
              fontSize: 16, fontWeight: 700, outline: "none",
              marginBottom: 6, display: "block", width: 220
            }}
          />
        ) : (
          <div onClick={() => setEditingName(true)} style={{
            fontSize: 16, fontWeight: 700, color: "#e8edf5",
            marginBottom: 4, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8
          }}>
            {name}
            <span style={{ fontSize: 10, color: "#4a5570" }}>✎</span>
          </div>
        )}
        {editingRole ? (
          <select autoFocus value={role}
            onChange={e => { setRole(e.target.value); setEditingRole(false) }}
            onBlur={() => setEditingRole(false)}
            style={{
              background: "#0a0c0f", border: "1px solid #9c6fff44",
              borderRadius: 6, padding: "3px 8px",
              color: "#9c6fff", fontFamily: "monospace",
              fontSize: 11, outline: "none"
            }}
          >
            {roles.map(r => <option key={r}>{r}</option>)}
          </select>
        ) : (
          <div onClick={() => setEditingRole(true)} style={{
            fontSize: 11, color: "#9c6fff",
            fontFamily: "monospace", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6
          }}>
            {role}
            <span style={{ fontSize: 10, color: "#4a5570" }}>✎</span>
          </div>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{
          fontSize: 9, textTransform: "uppercase",
          letterSpacing: "0.1em", color: "#4a5570",
          fontFamily: "monospace", marginBottom: 4
        }}>
          Start Date
        </div>
        <div style={{
          fontSize: 12, color: "#e8edf5", fontFamily: "monospace"
        }}>
          {startDate}
        </div>
      </div>
    </div>
  )
}

// ─── OVERALL PROGRESS ─────────────────────────────────────────────────────────
function OverallProgress({ progress }) {
  const { done, total, pct, checked } = progress
  const isComplete = pct === 100

  const getLabel = () => {
    if (pct === 0)  return "Not started yet"
    if (pct < 25)  return "Just getting started"
    if (pct < 50)  return "Making good progress"
    if (pct < 75)  return "More than halfway there"
    if (pct < 100) return "Almost there!"
    return "Onboarding complete! 🎉"
  }

  return (
    <div style={{
      background: "#111620", border: "1px solid #1e2535",
      borderRadius: 10, padding: "20px 24px", marginBottom: 24,
      borderTop: `2px solid ${isComplete ? "#00e676" : "#00e5ff"}`
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 14
      }}>
        <div>
          <div style={{
            fontSize: 14, fontWeight: 700,
            color: "#e8edf5", marginBottom: 3
          }}>
            Overall Progress
          </div>
          <div style={{
            fontSize: 11, color: "#4a5570", fontFamily: "monospace"
          }}>
            {getLabel()}
          </div>
        </div>
        <div style={{
          fontSize: 36, fontWeight: 800, lineHeight: 1,
          color: isComplete ? "#00e676" : "#00e5ff",
          fontFamily: "monospace"
        }}>
          {pct}%
        </div>
      </div>
      <div style={{
        height: 10, background: "#0a0c0f",
        borderRadius: 5, overflow: "hidden", marginBottom: 10
      }}>
        <div style={{
          height: "100%", borderRadius: 5, width: `${pct}%`,
          background: isComplete
            ? "#00e676"
            : "linear-gradient(90deg, #00e5ff, #9c6fff)",
          transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
          boxShadow: `0 0 10px ${isComplete ? "#00e676" : "#00e5ff"}66`
        }} />
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{
          fontSize: 11, color: "#4a5570", fontFamily: "monospace"
        }}>
          {done} of {total} tasks completed
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {TRACKS.map(t => {
            const tDone = t.items.filter(i => checked?.[i.id]).length
            const tPct  = Math.round((tDone / t.items.length) * 100)
            return (
              <div key={t.id} title={`${t.label}: ${tPct}%`} style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 4
              }}>
                <div style={{
                  width: 32, height: 4, background: "#0a0c0f",
                  borderRadius: 2, overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%", width: `${tPct}%`,
                    background: t.color, borderRadius: 2,
                    transition: "width 0.4s ease"
                  }} />
                </div>
                <div style={{ fontSize: 8, color: "#2e3d5a" }}>
                  {t.icon}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── QUICK STATS ──────────────────────────────────────────────────────────────
function QuickStats({ checked }) {
  const timeInvested = TRACKS.flatMap(t => t.items)
    .filter(i => checked[i.id] && i.est !== "varies")
    .reduce((acc, i) => acc + (parseInt(i.est) || 0), 0)

  const timeRemaining = TRACKS.flatMap(t => t.items)
    .filter(i => !checked[i.id] && i.est !== "varies")
    .reduce((acc, i) => acc + (parseInt(i.est) || 0), 0)

  const tracksDone = TRACKS.filter(
    t => t.items.every(i => checked[i.id])
  ).length

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
      {[
        { label: "Time Invested",  value: `${timeInvested} min`,                     color: "#00e5ff" },
        { label: "Time Remaining", value: timeRemaining > 0 ? `~${timeRemaining} min` : "Done!", color: "#ffb300" },
        { label: "Tracks Done",    value: `${tracksDone}/${TRACKS.length}`,           color: "#00e676" },
      ].map(s => (
        <div key={s.label} style={{
          flex: 1, background: "#111620",
          border: "1px solid #1e2535", borderRadius: 8,
          padding: "12px 16px"
        }}>
          <div style={{
            fontSize: 9, textTransform: "uppercase",
            letterSpacing: "0.12em", color: "#4a5570",
            fontFamily: "monospace", marginBottom: 6
          }}>
            {s.label}
          </div>
          <div style={{
            fontSize: 18, fontWeight: 800,
            color: s.color, fontFamily: "monospace"
          }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── TASK ITEM ────────────────────────────────────────────────────────────────
function TaskItem({ item, idx, isDone, trackColor, onToggle }) {
  const [showNote, setShowNote] = React.useState(false)

  return (
    <div style={{ borderBottom: "1px solid #0e1117" }}>
      <div style={{
        padding: "9px 18px 9px 52px",
        display: "flex", alignItems: "center",
        gap: 12, position: "relative"
      }}>
        <div
          onClick={() => onToggle(item.id)}
          style={{
            position: "absolute", left: 18,
            width: 22, height: 22, borderRadius: 6,
            background: isDone ? `${trackColor}22` : "#0a0c0f",
            border: `1px solid ${isDone ? trackColor : "#1e2535"}`,
            display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 9,
            fontFamily: "monospace",
            color: isDone ? trackColor : "#2e3d5a",
            fontWeight: 700, flexShrink: 0,
            cursor: "pointer", transition: "all 0.2s",
            boxShadow: isDone ? `0 0 6px ${trackColor}44` : "none"
          }}
        >
          {isDone ? "✓" : idx + 1}
        </div>
        <div
          onClick={() => onToggle(item.id)}
          style={{
            flex: 1, fontSize: 12, cursor: "pointer",
            color: isDone ? "#4a5570" : "#e8edf5",
            textDecoration: isDone ? "line-through" : "none",
            transition: "color 0.2s"
          }}
        >
          {item.text}
        </div>
        <div style={{
          fontSize: 10, color: "#2e3d5a",
          fontFamily: "monospace", flexShrink: 0
        }}>
          {item.est}
        </div>
        <button
          onClick={() => setShowNote(n => !n)}
          style={{
            background: showNote ? "#ffb30018" : "transparent",
            border: `1px solid ${showNote ? "#ffb30044" : "#1e2535"}`,
            borderRadius: 4, padding: "2px 7px",
            color: showNote ? "#ffb300" : "#4a5570",
            cursor: "pointer", fontSize: 10,
            fontFamily: "monospace", flexShrink: 0,
            transition: "all 0.15s"
          }}
        >
          hint
        </button>
      </div>
      {showNote && (
        <div style={{
          margin: "0 18px 10px 52px",
          padding: "10px 12px", borderRadius: 6,
          background: "#0a0c0f",
          border: "1px solid #ffb30033",
          borderLeft: "3px solid #ffb300",
          fontSize: 11, color: "#8a95b0",
          fontFamily: "monospace", lineHeight: 1.6
        }}>
          💡 {item.note}
        </div>
      )}
    </div>
  )
}

// ─── TRACK CARD ───────────────────────────────────────────────────────────────
function TrackCard({ track, checked, onToggle }) {
  const [expanded, setExpanded] = React.useState(true)
  const done  = track.items.filter(i => checked[i.id]).length
  const total = track.items.length
  const pct   = Math.round((done / total) * 100)
  const isComplete = pct === 100

  return (
    <div style={{
      background: "#111620", border: "1px solid #1e2535",
      borderRadius: 10, overflow: "hidden", marginBottom: 12
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          padding: "14px 18px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 14,
          transition: "background 0.1s"
        }}
        onMouseEnter={e => e.currentTarget.style.background = "#171e2c"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: `${track.color}18`,
          border: `1px solid ${track.color}44`,
          display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 18
        }}>
          {isComplete ? "✅" : track.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: "#e8edf5", marginBottom: 2
          }}>
            {track.label}
          </div>
          <div style={{
            fontSize: 10, color: "#4a5570", fontFamily: "monospace"
          }}>
            {track.desc}
          </div>
        </div>
        <div style={{
          fontSize: 12, fontFamily: "monospace",
          color: isComplete ? track.color : "#4a5570",
          fontWeight: isComplete ? 700 : 400, flexShrink: 0
        }}>
          {done}/{total}
        </div>
        <div style={{
          color: "#4a5570", fontSize: 12, flexShrink: 0,
          transition: "transform 0.2s",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)"
        }}>
          ▶
        </div>
      </div>

      <div style={{ height: 3, background: "#0a0c0f" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: track.color, transition: "width 0.5s ease",
          boxShadow: pct > 0 ? `0 0 6px ${track.color}88` : "none"
        }} />
      </div>

      {expanded && (
        <div style={{ paddingTop: 4 }}>
          {track.items.map((item, idx) => (
            <TaskItem
              key={item.id}
              item={item}
              idx={idx}
              isDone={!!checked[item.id]}
              trackColor={track.color}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── COMPLETION BANNER ────────────────────────────────────────────────────────
function CompletionBanner({ name }) {
  const [visible, setVisible] = React.useState(true)
  if (!visible) return null

  return (
    <div style={{
      background: "linear-gradient(135deg, #00e67610, #00e5ff10)",
      border: "1px solid #00e67644", borderRadius: 12,
      padding: "28px", marginBottom: 24,
      textAlign: "center", position: "relative", overflow: "hidden"
    }}>
      <button onClick={() => setVisible(false)} style={{
        position: "absolute", top: 12, right: 14,
        background: "none", border: "none",
        color: "#4a5570", cursor: "pointer", fontSize: 16
      }}>
        ✕
      </button>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
      <div style={{
        fontSize: 20, fontWeight: 800,
        color: "#00e676", marginBottom: 8
      }}>
        Onboarding Complete!
      </div>
      <div style={{
        fontSize: 13, color: "#8a95b0",
        marginBottom: 20, lineHeight: 1.6
      }}>
        <strong style={{ color: "#e8edf5" }}>{name}</strong> has completed
        all onboarding tracks and is ready to contribute to CodeCompass.
      </div>
      <div style={{
        display: "flex", gap: 10,
        justifyContent: "center", flexWrap: "wrap"
      }}>
        {[
          { icon: "⚡", label: "Environment Ready",  color: "#00e5ff" },
          { icon: "🗺️", label: "Codebase Oriented",  color: "#9c6fff" },
          { icon: "🏗️", label: "Architecture Known", color: "#ffb300" },
          { icon: "🚀", label: "First Contribution",  color: "#00e676" },
        ].map(badge => (
          <div key={badge.label} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 20,
            background: `${badge.color}18`,
            border: `1px solid ${badge.color}44`,
            fontSize: 11, color: badge.color, fontFamily: "monospace"
          }}>
            {badge.icon} {badge.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const [name,      setName]    = React.useState("New Developer")
  const [role,      setRole]    = React.useState("Full Stack Developer")
  const [checked,   setChecked] = React.useState({})
  const [startDate] = React.useState(
    new Date().toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric"
    })
  )

  const toggle = (id) =>
    setChecked(p => ({ ...p, [id]: !p[id] }))

  const resetAll = () => {
    if (window.confirm("Reset all progress? This cannot be undone.")) {
      setChecked({})
    }
  }

  const allItems   = getAllItems()
  const done       = allItems.filter(id => checked[id]).length
  const pct        = Math.round((done / allItems.length) * 100)
  const progress   = { done, total: allItems.length, pct, checked }
  const isComplete = pct === 100

  return (
    <div style={{
      padding: 24, background: "#0a0c0f",
      minHeight: "100%", color: "#e8edf5"
    }}>

      {/* HEADER */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 24
      }}>
        <div>
          <h2 style={{
            fontSize: 20, fontWeight: 700,
            margin: 0, marginBottom: 4
          }}>
            Onboarding Checklist
          </h2>
          <div style={{
            fontSize: 11, color: "#4a5570", fontFamily: "monospace"
          }}>
            // track developer progress from day 0 to first contribution
          </div>
        </div>

        {/* Reset button */}
        <button onClick={resetAll} style={{
          padding: "6px 14px", borderRadius: 6,
          border: "1px solid #ff444422",
          background: "#ff444410", color: "#ff4444",
          cursor: "pointer", fontSize: 11,
          fontFamily: "monospace", transition: "all 0.15s"
        }}>
          Reset Progress
        </button>
      </div>

      {/* COMPLETION BANNER */}
      {isComplete && <CompletionBanner name={name} />}

      {/* PROFILE */}
      <ProfileCard
        name={name}      setName={setName}
        role={role}      setRole={setRole}
        startDate={startDate}
      />

      {/* EXPORT */}
      <ExportPanel
        name={name} role={role}
        startDate={startDate} checked={checked}
      />

      {/* QUICK STATS */}
      <QuickStats checked={checked} />

      {/* OVERALL PROGRESS */}
      <OverallProgress progress={progress} />

      {/* TRACKS */}
      <div>
        <div style={{
          fontSize: 10, textTransform: "uppercase",
          letterSpacing: "0.12em", color: "#4a5570",
          fontFamily: "monospace", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 8
        }}>
          Onboarding Tracks
          <div style={{ flex: 1, height: 1, background: "#1e2535" }} />
        </div>

        {TRACKS.map(track => (
          <TrackCard
            key={track.id}
            track={track}
            checked={checked}
            onToggle={toggle}
          />
        ))}
      </div>

    </div>
  )
}
