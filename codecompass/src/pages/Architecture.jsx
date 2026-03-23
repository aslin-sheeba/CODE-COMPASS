import React from "react"
import ModuleGraph from "../components/ModuleGraph"
import { useProjectStore } from "../state/projectStore"
import { findCycles } from "../services/cycleService"

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getStressColor(score) {
  if (score > 20) return "#ff4444"
  if (score > 10) return "#ffb300"
  return "#00e676"
}

function getExtColor(path) {
  const ext = (path || "").match(/\.(\w+)$/)?.[1] || "other"
  const map = {
    tsx: "#00e5ff", ts: "#3b82f6", jsx: "#06b6d4",
    js:  "#ffb300", css: "#9c6fff", json: "#00e676",
  }
  return map[ext] || "#4a5570"
}

function getFileName(path) {
  return (path || "").replace(/\\/g, "/").split("/").pop()
}

function isExternal(imp) {
  return !imp.startsWith(".") && !imp.startsWith("/")
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "#111620", border: "1px solid #1e2535",
      borderRadius: 8, padding: "12px 18px", flex: 1,
      borderTop: `2px solid ${color}`
    }}>
      <div style={{
        fontSize: 9, textTransform: "uppercase",
        letterSpacing: "0.12em", color: "#4a5570",
        fontFamily: "monospace", marginBottom: 6
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 800,
        color, lineHeight: 1, fontFamily: "monospace"
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: 9, color: "#4a5570",
          fontFamily: "monospace", marginTop: 3
        }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ─── LEGEND ───────────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { color: "#00e676", label: "Low stress",    desc: "≤ 10"     },
    { color: "#ffb300", label: "Medium stress", desc: "11–20"    },
    { color: "#ff4444", label: "High stress",   desc: "> 20"     },
    { color: "#ff4444", label: "Cyclic edge",   desc: "circular" },
    { color: "#9c6fff", label: "Unused node",   desc: "0 fan-in" },
  ]
  return (
    <div style={{
      background: "#111620", border: "1px solid #1e2535",
      borderRadius: 8, padding: "10px 16px",
      display: "flex", gap: 18, flexWrap: "wrap",
      alignItems: "center", flexShrink: 0
    }}>
      <div style={{
        fontSize: 9, textTransform: "uppercase",
        letterSpacing: "0.1em", color: "#4a5570",
        fontFamily: "monospace", flexShrink: 0
      }}>
        Legend
      </div>
      {items.map(item => (
        <div key={item.label} style={{
          display: "flex", alignItems: "center", gap: 6
        }}>
          <div style={{
            width: 9, height: 9, borderRadius: "50%",
            background: item.color, flexShrink: 0,
            boxShadow: `0 0 4px ${item.color}88`
          }} />
          <span style={{
            fontSize: 10, color: "#e8edf5", fontFamily: "monospace"
          }}>
            {item.label}
          </span>
          <span style={{
            fontSize: 9, color: "#4a5570", fontFamily: "monospace"
          }}>
            {item.desc}
          </span>
        </div>
      ))}
      <div style={{ marginLeft: "auto", flexShrink: 0 }}>
        <span style={{
          fontSize: 9, color: "#2e3d5a", fontFamily: "monospace"
        }}>
          scroll to zoom · drag to pan · click node to inspect
        </span>
      </div>
    </div>
  )
}

// ─── CONTROLS ─────────────────────────────────────────────────────────────────
function Controls({ showCycles, setShowCycles,
  showUnused, setShowUnused, onReset }) {
  const btnStyle = (active, color = "#00e5ff") => ({
    padding: "5px 12px", borderRadius: 5, border: "1px solid",
    borderColor: active ? `${color}44` : "#1e2535",
    background: active ? `${color}12` : "transparent",
    color: active ? color : "#4a5570",
    fontSize: 10, fontFamily: "monospace",
    cursor: "pointer", transition: "all 0.15s"
  })

  return (
    <div style={{
      display: "flex", gap: 8,
      alignItems: "center", flexWrap: "wrap", flexShrink: 0
    }}>
      <span style={{
        fontSize: 9, textTransform: "uppercase",
        letterSpacing: "0.1em", color: "#4a5570",
        fontFamily: "monospace"
      }}>
        Filters
      </span>
      <button
        style={btnStyle(showCycles, "#ff4444")}
        onClick={() => setShowCycles(v => !v)}
      >
        {showCycles ? "● " : "○ "}Highlight Cycles
      </button>
      <button
        style={btnStyle(showUnused, "#9c6fff")}
        onClick={() => setShowUnused(v => !v)}
      >
        {showUnused ? "● " : "○ "}Show Unused
      </button>
      <button onClick={onReset} style={{
        padding: "5px 12px", borderRadius: 5,
        border: "1px solid #1e2535",
        background: "transparent", color: "#4a5570",
        fontSize: 10, fontFamily: "monospace",
        cursor: "pointer", marginLeft: "auto"
      }}>
        ↺ Reset View
      </button>
    </div>
  )
}

// ─── NODE DETAIL PANEL ────────────────────────────────────────────────────────
function NodeDetailPanel({ file, files, onClose }) {
  if (!file) return null

  const meta     = file._meta || {}
  const score    = meta.stressScore || 0
  const color    = getStressColor(score)
  const extColor = getExtColor(file.path)
  const ext      = file.path.match(/\.(\w+)$/)?.[1] || "?"
  const imports  = file.imports || []
  const external = imports.filter(isExternal)
  const local    = imports.filter(i => !isExternal(i))

  const usedBy = files.filter(f =>
    f.path !== file.path &&
    (f.imports || []).some(imp =>
      imp.includes(
        getFileName(file.path).replace(/\.(tsx|ts|jsx|js)$/, "")
      )
    )
  )

  const insights = []
  if (score > 20)
    insights.push({ icon: "🔴", text: "Critical stress — refactoring priority",             color: "#ff4444" })
  else if (score > 10)
    insights.push({ icon: "🟡", text: "Moderate stress — monitor coupling",                 color: "#ffb300" })
  if (usedBy.length >= 3)
    insights.push({ icon: "🔥", text: `Core module — ${usedBy.length} files depend on it`, color: "#00e5ff" })
  if (usedBy.length === 0 &&
    !file.path.includes("App.") &&
    !file.path.includes("main.") &&
    !file.path.includes("index."))
    insights.push({ icon: "👻", text: "Possibly unused — zero incoming imports",            color: "#9c6fff" })
  if (imports.length > 5)
    insights.push({ icon: "⚠️", text: `High fan-out — imports ${imports.length} modules`,  color: "#ffb300" })
  if (insights.length === 0)
    insights.push({ icon: "✅", text: "Healthy module — no issues detected",                color: "#00e676" })

  return (
    <div style={{
      width: 270, flexShrink: 0,
      background: "#0e1117", border: "1px solid #1e2535",
      borderRadius: 8, display: "flex",
      flexDirection: "column", overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{
        padding: "11px 13px", borderBottom: "1px solid #1e2535",
        background: "#0a0c0f", display: "flex",
        alignItems: "center", gap: 9, flexShrink: 0
      }}>
        <div style={{
          width: 28, height: 19, borderRadius: 3,
          background: `${extColor}18`, border: `1px solid ${extColor}44`,
          display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 8,
          fontFamily: "monospace", fontWeight: 700,
          color: extColor, flexShrink: 0
        }}>
          {ext}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "#e8edf5",
            fontFamily: "monospace", overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap"
          }}>
            {getFileName(file.path)}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none",
          color: "#4a5570", cursor: "pointer",
          fontSize: 14, padding: 0, flexShrink: 0
        }}>✕</button>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {/* Stress bar */}
        <div style={{ padding: "13px 13px 0" }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            marginBottom: 5
          }}>
            <span style={{
              fontSize: 9, textTransform: "uppercase",
              letterSpacing: "0.1em", color: "#4a5570",
              fontFamily: "monospace"
            }}>
              Stress Score
            </span>
            <span style={{
              fontSize: 12, fontWeight: 800,
              color, fontFamily: "monospace"
            }}>
              {score}
            </span>
          </div>
          <div style={{
            height: 5, background: "#0a0c0f",
            borderRadius: 3, overflow: "hidden"
          }}>
            <div style={{
              height: "100%", borderRadius: 3,
              width: `${Math.min((score / 30) * 100, 100)}%`,
              background: color, transition: "width 0.5s ease",
              boxShadow: `0 0 6px ${color}88`
            }} />
          </div>
        </div>

        {/* Metrics grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 7, padding: "11px 13px"
        }}>
          {[
            { label: "Fan-Out",  value: imports.length,     color: "#9c6fff" },
            { label: "Fan-In",   value: usedBy.length,      color: "#00e5ff" },
            { label: "Local",    value: local.length,       color: "#ffb300" },
            { label: "External", value: external.length,    color: "#00e676" },
            { label: "Lines",    value: file.lines || "—",  color: "#e8edf5" },
            { label: "Incoming", value: meta.incoming || 0, color: "#00e5ff" },
          ].map(m => (
            <div key={m.label} style={{
              background: "#111620", border: "1px solid #1e2535",
              borderRadius: 6, padding: "7px 9px"
            }}>
              <div style={{
                fontSize: 9, textTransform: "uppercase",
                letterSpacing: "0.08em", color: "#4a5570",
                fontFamily: "monospace", marginBottom: 3
              }}>
                {m.label}
              </div>
              <div style={{
                fontSize: 16, fontWeight: 800,
                color: m.color, fontFamily: "monospace"
              }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Insights */}
        <div style={{ padding: "0 13px 11px" }}>
          <div style={{
            fontSize: 9, textTransform: "uppercase",
            letterSpacing: "0.1em", color: "#4a5570",
            fontFamily: "monospace", marginBottom: 7
          }}>
            Insights
          </div>
          <div style={{
            display: "flex", flexDirection: "column", gap: 5
          }}>
            {insights.map((ins, i) => (
              <div key={i} style={{
                padding: "7px 9px", borderRadius: 6,
                background: "#111620",
                border: `1px solid ${ins.color}22`,
                borderLeft: `3px solid ${ins.color}`,
                display: "flex", gap: 7, alignItems: "flex-start"
              }}>
                <span style={{ fontSize: 11, flexShrink: 0 }}>
                  {ins.icon}
                </span>
                <span style={{
                  fontSize: 10, color: "#8a95b0", lineHeight: 1.5
                }}>
                  {ins.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Imports */}
        {imports.length > 0 && (
          <div style={{ padding: "0 13px 11px" }}>
            <div style={{
              fontSize: 9, textTransform: "uppercase",
              letterSpacing: "0.1em", color: "#4a5570",
              fontFamily: "monospace", marginBottom: 7
            }}>
              Imports ({imports.length})
            </div>
            <div style={{
              background: "#111620", border: "1px solid #1e2535",
              borderRadius: 6, overflow: "hidden"
            }}>
              {imports.slice(0, 10).map((imp, i) => (
                <div key={i} style={{
                  padding: "5px 9px",
                  borderBottom: i < Math.min(imports.length, 10) - 1
                    ? "1px solid #0a0c0f" : "none",
                  display: "flex", alignItems: "center", gap: 6
                }}>
                  <span style={{
                    fontSize: 8, width: 20, flexShrink: 0,
                    color: isExternal(imp) ? "#9c6fff" : "#00e5ff",
                    fontFamily: "monospace"
                  }}>
                    {isExternal(imp) ? "pkg" : "rel"}
                  </span>
                  <span style={{
                    fontSize: 10, color: "#8a95b0",
                    fontFamily: "monospace", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap"
                  }}>
                    {imp}
                  </span>
                </div>
              ))}
              {imports.length > 10 && (
                <div style={{
                  padding: "5px 9px", fontSize: 9,
                  color: "#4a5570", fontFamily: "monospace"
                }}>
                  +{imports.length - 10} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Used By */}
        {usedBy.length > 0 && (
          <div style={{ padding: "0 13px 14px" }}>
            <div style={{
              fontSize: 9, textTransform: "uppercase",
              letterSpacing: "0.1em", color: "#4a5570",
              fontFamily: "monospace", marginBottom: 7
            }}>
              Used By ({usedBy.length})
            </div>
            <div style={{
              background: "#111620", border: "1px solid #1e2535",
              borderRadius: 6, overflow: "hidden"
            }}>
              {usedBy.slice(0, 8).map((f, i) => (
                <div key={i} style={{
                  padding: "5px 9px",
                  borderBottom: i < Math.min(usedBy.length, 8) - 1
                    ? "1px solid #0a0c0f" : "none",
                  display: "flex", alignItems: "center", gap: 6
                }}>
                  <span style={{
                    fontSize: 8, color: "#00e676",
                    fontFamily: "monospace", flexShrink: 0
                  }}>←</span>
                  <span style={{
                    fontSize: 10, color: "#8a95b0",
                    fontFamily: "monospace", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap"
                  }}>
                    {getFileName(f.path)}
                  </span>
                </div>
              ))}
              {usedBy.length > 8 && (
                <div style={{
                  padding: "5px 9px", fontSize: 9,
                  color: "#4a5570", fontFamily: "monospace"
                }}>
                  +{usedBy.length - 8} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CYCLE DETECTOR PANEL ─────────────────────────────────────────────────────
function CycleDetectorPanel({ files, onHighlightCycle }) {
  const [expanded,      setExpanded]      = React.useState(true)
  const [selectedCycle, setSelectedCycle] = React.useState(null)

  const cycles = React.useMemo(() => {
    if (!files.length) return []
    try { return findCycles(files) } catch { return [] }
  }, [files])

  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{
          background: "#111620", border: "1px solid #1e2535",
          borderRadius: 8, padding: "10px 16px",
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer", flexShrink: 0
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14 }}>🔁</span>
          <span style={{
            fontSize: 12, fontWeight: 700, color: "#e8edf5"
          }}>
            Cycle Detector
          </span>
          {cycles.length > 0 && (
            <span style={{
              padding: "1px 8px", borderRadius: 3,
              background: "#ff444418", color: "#ff4444",
              fontSize: 10, fontFamily: "monospace", fontWeight: 700
            }}>
              {cycles.length} found
            </span>
          )}
        </div>
        <span style={{ color: "#4a5570", fontSize: 12 }}>▶</span>
      </div>
    )
  }

  return (
    <div style={{
      background: "#111620", border: "1px solid #1e2535",
      borderRadius: 8, overflow: "hidden", flexShrink: 0
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(false)}
        style={{
          padding: "11px 16px", borderBottom: "1px solid #1e2535",
          background: "#0e1117", cursor: "pointer",
          display: "flex", alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14 }}>🔁</span>
          <span style={{
            fontSize: 13, fontWeight: 700, color: "#e8edf5"
          }}>
            Cycle Detector
          </span>
          <span style={{
            fontSize: 10, color: "#4a5570", fontFamily: "monospace"
          }}>
            circular dependency analysis
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {cycles.length > 0 ? (
            <span style={{
              padding: "2px 10px", borderRadius: 4,
              background: "#ff444418",
              border: "1px solid #ff444433",
              color: "#ff4444", fontSize: 10,
              fontFamily: "monospace", fontWeight: 700
            }}>
              {cycles.length} cycle{cycles.length !== 1 ? "s" : ""} detected
            </span>
          ) : (
            <span style={{
              padding: "2px 10px", borderRadius: 4,
              background: "#00e67618",
              border: "1px solid #00e67633",
              color: "#00e676", fontSize: 10,
              fontFamily: "monospace", fontWeight: 700
            }}>
              ✓ No cycles
            </span>
          )}
          <span style={{ color: "#4a5570", fontSize: 11 }}>▼</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "12px 16px" }}>
        {cycles.length === 0 ? (
          <div style={{
            padding: "16px 0", textAlign: "center",
            color: "#4a5570", fontFamily: "monospace", fontSize: 11
          }}>
            🎉 No circular dependencies found in this project
          </div>
        ) : (
          <>
            {/* Warning banner */}
            <div style={{
              padding: "10px 12px", borderRadius: 6,
              background: "#ff444410",
              border: "1px solid #ff444422",
              borderLeft: "3px solid #ff4444",
              marginBottom: 12, fontSize: 11,
              color: "#8a95b0", lineHeight: 1.5
            }}>
              ⚠️ Circular dependencies can cause unpredictable module
              loading, memory leaks, and hard-to-debug runtime errors.
              Refactor these to use dependency injection or event patterns.
            </div>

            {/* Cycle list */}
            <div style={{
              display: "flex", flexDirection: "column", gap: 8
            }}>
              {cycles.map((cycle, i) => {
                const isSelected = selectedCycle === i
                const cycleFiles = cycle.map(getFileName)
                return (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedCycle(isSelected ? null : i)
                      onHighlightCycle(isSelected ? null : cycle)
                    }}
                    style={{
                      padding: "10px 12px", borderRadius: 6,
                      background: isSelected ? "#ff444412" : "#0a0c0f",
                      border: `1px solid ${isSelected ? "#ff444444" : "#1e2535"}`,
                      cursor: "pointer", transition: "all 0.15s"
                    }}
                  >
                    {/* Cycle header */}
                    <div style={{
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between", marginBottom: 8
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 9, fontFamily: "monospace",
                          color: "#ff4444", fontWeight: 700,
                          padding: "1px 6px", borderRadius: 3,
                          background: "#ff444418"
                        }}>
                          CYCLE {i + 1}
                        </span>
                        <span style={{
                          fontSize: 9, color: "#4a5570",
                          fontFamily: "monospace"
                        }}>
                          {cycle.length} file{cycle.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {isSelected && (
                        <span style={{
                          fontSize: 9, color: "#ff4444",
                          fontFamily: "monospace"
                        }}>
                          highlighted ●
                        </span>
                      )}
                    </div>

                    {/* Cycle chain */}
                    <div style={{
                      display: "flex", alignItems: "center",
                      gap: 4, flexWrap: "wrap"
                    }}>
                      {cycleFiles.map((name, j) => (
                        <React.Fragment key={j}>
                          <span style={{
                            fontSize: 10, color: "#e8edf5",
                            fontFamily: "monospace",
                            padding: "1px 6px", borderRadius: 3,
                            background: "#1e2535"
                          }}>
                            {name}
                          </span>
                          {j < cycleFiles.length - 1 && (
                            <span style={{
                              fontSize: 10, color: "#ff4444"
                            }}>
                              →
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                      {/* Close the loop arrow */}
                      <span style={{ fontSize: 10, color: "#ff4444" }}>
                        ↩
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tip */}
            <div style={{
              marginTop: 12, padding: "8px 12px",
              borderRadius: 6, background: "#00e5ff08",
              border: "1px solid #00e5ff14",
              fontSize: 10, color: "#4a5570",
              fontFamily: "monospace", lineHeight: 1.6
            }}>
              💡 Click a cycle to highlight it in the graph above
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Architecture() {
  const { files, selectedFile } = useProjectStore()

  const [showCycles,      setShowCycles]      = React.useState(true)
  const [showUnused,      setShowUnused]      = React.useState(false)
  const [resetKey,        setResetKey]        = React.useState(0)
  const [activeCycle,     setActiveCycle]     = React.useState(null)

  const totalModules = files.length
  const totalDeps    = files.reduce(
    (acc, f) => acc + (f.imports?.length || 0), 0
  )
  const highCoupling = files.filter(
    f => (f._meta?.stressScore || 0) > 20
  ).length
  const cleanModules = files.filter(
    f => (f._meta?.stressScore || 0) <= 6
  ).length
  const unusedCount  = files.filter(
    f => (f._meta?.incoming || 0) === 0 &&
      !f.path.includes("main.") &&
      !f.path.includes("App.")  &&
      !f.path.includes("index.")
  ).length

  return (
    <div style={{
      padding: 16, background: "#0a0c0f",
      height: "100%", color: "#e8edf5",
      display: "flex", flexDirection: "column",
      gap: 10, overflow: "auto",
      boxSizing: "border-box"
    }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0 }}>
        <h2 style={{
          fontSize: 17, fontWeight: 700,
          margin: 0, marginBottom: 2, color: "#e8edf5"
        }}>
          Module Architecture
        </h2>
        <div style={{
          fontSize: 11, color: "#4a5570", fontFamily: "monospace"
        }}>
          // interactive dependency graph — click any node to inspect
        </div>
      </div>

      {/* STATS ROW */}
      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        <StatCard label="Total Modules"  value={totalModules} color="#00e5ff" />
        <StatCard label="Dependencies"   value={totalDeps}    color="#9c6fff" />
        <StatCard label="High Coupling"  value={highCoupling} color="#ff4444" sub="stress > 20" />
        <StatCard label="Clean Modules"  value={cleanModules} color="#00e676" sub="stress ≤ 6"  />
        <StatCard label="Unused Files"   value={unusedCount}  color="#ffb300" sub="zero fan-in" />
      </div>

      {/* LEGEND */}
      <Legend />

      {/* CONTROLS */}
      <Controls
        showCycles={showCycles} setShowCycles={setShowCycles}
        showUnused={showUnused} setShowUnused={setShowUnused}
        onReset={() => {
          setResetKey(k => k + 1)
          setActiveCycle(null)
        }}
      />

      {/* GRAPH + DETAIL PANEL */}
      <div style={{
        display: "flex", gap: 10,
        overflow: "hidden", minHeight: 500, flexShrink: 0
      }}>
        {/* Graph */}
        <div style={{
          flex: 1, background: "#0e1117",
          border: "1px solid #1e2535",
          borderRadius: 8, overflow: "hidden",
          display: "flex", flexDirection: "column"
        }}>
          <ModuleGraph
            key={resetKey}
            width={selectedFile ? 800 : 1100}
            height={500}
            activeCycle={activeCycle}
          />
        </div>

        {/* Node detail panel */}
        {selectedFile && (
          <NodeDetailPanel
            file={selectedFile}
            files={files}
            onClose={() =>
              useProjectStore.getState().selectFile(null)
            }
          />
        )}
      </div>

      {/* CYCLE DETECTOR */}
      <CycleDetectorPanel
        files={files}
        onHighlightCycle={setActiveCycle}
      />

    </div>
  )
}
