// src/components/Dashboard/ActivityFeed.jsx
// Tracks & displays recently visited files + project events.
// Exposes addActivity() so App.jsx can push events from any tab.
import React from "react"
import { T } from "../../theme"
import { basename, extname, getExtColor } from "../../utils"

// ── Shared activity log (module-level ring buffer, max 40) ───────────────────
const MAX = 40
let _activities = []
const _listeners = new Set()

function notify() { _listeners.forEach(fn => fn([..._activities])) }

/**
 * Push a new activity from anywhere in the app.
 * type: "file_open" | "scan" | "ai" | "search" | "import" | "session"
 */
export function addActivity(type, label, meta = {}) {
  _activities = [{
    id:    Date.now() + Math.random(),
    type,
    label,
    meta,
    ts:    Date.now(),
  }, ..._activities].slice(0, MAX)
  notify()
}

function useActivities() {
  const [list, setList] = React.useState([..._activities])
  React.useEffect(() => {
    _listeners.add(setList)
    return () => _listeners.delete(setList)
  }, [])
  return list
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function relTime(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 5)   return "just now"
  if (s < 60)  return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

const TYPE_META = {
  file_open: { icon: "📄", color: T.teal   },
  scan:      { icon: "🔍", color: T.blue   },
  ai:        { icon: "🤖", color: "#8b5cf6" },
  search:    { icon: "🔎", color: T.orange },
  import:    { icon: "📦", color: T.green  },
  session:   { icon: "💾", color: T.amber  },
  git:       { icon: "🌿", color: T.teal   },
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ActivityFeed({ onFileClick }) {
  const activities = useActivities()
  const [, tick] = React.useReducer(x => x + 1, 0)

  // Re-render timestamps every 15 s
  React.useEffect(() => {
    const id = setInterval(tick, 15_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.rMd, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "8px 12px", borderBottom: `1px solid ${T.border}`,
        background: T.surfaceAlt,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, fontWeight: 600 }}>
          ⚡ Activity
        </span>
        {activities.length > 0 && (
          <span style={{ fontSize: 9, color: T.textHint, fontFamily: "monospace" }}>
            {activities.length} events
          </span>
        )}
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", maxHeight: 240 }}>
        {activities.length === 0 ? (
          <div style={{ padding: "16px 12px", fontSize: 11, color: T.textHint, textAlign: "center" }}>
            No activity yet
          </div>
        ) : activities.map(a => {
          const m    = TYPE_META[a.type] || { icon: "•", color: T.textHint }
          const isFile = a.type === "file_open" && a.meta?.file
          return (
            <div key={a.id}
              onClick={isFile ? () => onFileClick?.(a.meta.file) : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 12px",
                borderBottom: `1px solid ${T.border}`,
                cursor: isFile ? "pointer" : "default",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { if (isFile) e.currentTarget.style.background = T.surfaceAlt }}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {/* Icon dot */}
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: m.color, flexShrink: 0,
              }} />

              {/* Label */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11, color: T.text, fontFamily: "monospace",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{a.label}</div>
                {a.meta?.sub && (
                  <div style={{ fontSize: 9, color: T.textHint, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.meta.sub}
                  </div>
                )}
              </div>

              {/* Time */}
              <span style={{ fontSize: 9, color: T.textHint, fontFamily: "monospace", flexShrink: 0 }}>
                {relTime(a.ts)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
