import React from "react"
import { useProjectStore } from "../state/projectStore"

// ─── MOCK FALLBACK DATA ───────────────────────────────────────────────────────
const MOCK_STATS = {
  totalCommits: 142, contributors: 3, thisWeek: 12,
  filesChanged: 38,  additions: 1204, deletions: 387,
  activeBranch: "main", lastCommit: "2h ago",
}

const MOCK_COMMITS = [
  { hash: "a3f8c1d", message: "feat: add dependency scanner worker",
    author: "Aslin", email: "aslin@dev.com", date: "2h ago",
    branch: "main", additions: 84, deletions: 12, filesChanged: 3 },
  { hash: "b91e204", message: "fix: remove duplicate testScanner fn",
    author: "Aslin", email: "aslin@dev.com", date: "4h ago",
    branch: "main", additions: 0, deletions: 18, filesChanged: 1 },
  { hash: "c45d831", message: "refactor: consolidate layout components",
    author: "Dev", email: "dev@team.com", date: "1d ago",
    branch: "main", additions: 42, deletions: 96, filesChanged: 5 },
  { hash: "e72b559", message: "feat: wire api.ts to backend routes",
    author: "Aslin", email: "aslin@dev.com", date: "1d ago",
    branch: "feature/api", additions: 31, deletions: 4, filesChanged: 2 },
  { hash: "f18a340", message: "chore: MongoDB connection retry",
    author: "Dev", email: "dev@team.com", date: "2d ago",
    branch: "main", additions: 22, deletions: 8, filesChanged: 1 },
  { hash: "91cc772", message: "feat: D3 force simulation graph",
    author: "Aslin", email: "aslin@dev.com", date: "3d ago",
    branch: "feature/graph", additions: 312, deletions: 0, filesChanged: 2 },
]

const MOCK_CONTRIBUTORS = [
  { name: "Aslin", commits: 78, additions: 853, deletions: 40,  pct: 55 },
  { name: "Dev",   commits: 48, additions: 280, deletions: 310, pct: 34 },
  { name: "Sam",   commits: 16, additions: 71,  deletions: 37,  pct: 11 },
]

const MOCK_CHURN = [
  { file: "src/components/ModuleGraph.jsx", additions: 312, deletions: 0,  commits: 4 },
  { file: "src/state/projectStore.js",      additions: 98,  deletions: 14, commits: 3 },
  { file: "src/pages/Dashboard.jsx",        additions: 84,  deletions: 30, commits: 5 },
  { file: "electron/ipc/projectIPC.js",     additions: 72,  deletions: 8,  commits: 2 },
  { file: "src/services/riskService.js",    additions: 55,  deletions: 10, commits: 3 },
]

function generateHeatmap() {
  const cells = []
  for (let i = 0; i < 26 * 7; i++) {
    const rand = Math.random()
    let count = 0
    if (rand > 0.65) count = Math.floor(Math.random() * 2) + 1
    if (rand > 0.82) count = Math.floor(Math.random() * 3) + 2
    if (rand > 0.94) count = Math.floor(Math.random() * 4) + 4
    cells.push(count)
  }
  return cells
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getHeatColor(count) {
  if (count === 0) return "#1a2235"
  if (count <= 1)  return "#0e4d3a"
  if (count <= 3)  return "#0d6b50"
  if (count <= 5)  return "#00a876"
  return "#00e676"
}

function getInitials(name) {
  return (name || "?").split(" ")
    .map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

function getAuthorColor(name) {
  const colors = ["#00e5ff", "#9c6fff", "#ffb300", "#00e676", "#ff4444"]
  let hash = 0
  for (let i = 0; i < (name || "").length; i++)
    hash += name.charCodeAt(i)
  return colors[hash % colors.length]
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "#111620", border: "1px solid #1e2535",
      borderRadius: 8, padding: "14px 20px", flex: 1,
      borderTop: `2px solid ${color}`
    }}>
      <div style={{
        fontSize: 10, textTransform: "uppercase",
        letterSpacing: "0.12em", color: "#4a5570",
        fontFamily: "monospace", marginBottom: 8
      }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: 10, color: "#4a5570",
          fontFamily: "monospace", marginTop: 4
        }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ─── HEATMAP ──────────────────────────────────────────────────────────────────
function Heatmap({ data }) {
  const [hovered, setHovered] = React.useState(null)
  const weeks = 26
  return (
    <div style={{
      background: "#111620", border: "1px solid #1e2535",
      borderRadius: 8, overflow: "hidden", marginBottom: 20
    }}>
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid #1e2535",
        background: "#0e1117"
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e8edf5" }}>
          Contribution Heatmap
        </div>
        <div style={{
          fontSize: 10, color: "#4a5570",
          fontFamily: "monospace", marginTop: 2
        }}>
          last 26 weeks of commit activity
        </div>
      </div>
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{
            display: "flex", flexDirection: "column", gap: 3, paddingTop: 1
          }}>
            {DAYS.map((d, i) => (
              <div key={d} style={{
                height: 12, fontSize: 8,
                color: i % 2 === 0 ? "#4a5570" : "transparent",
                fontFamily: "monospace", lineHeight: "12px",
                width: 24, textAlign: "right"
              }}>
                {d}
              </div>
            ))}
          </div>
          <div style={{
            display: "grid",
            gridTemplateRows: "repeat(7, 12px)",
            gridTemplateColumns: `repeat(${weeks}, 12px)`,
            gridAutoFlow: "column", gap: 3
          }}>
            {data.map((count, i) => (
              <div key={i}
                onMouseEnter={() => setHovered({ i, count })}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: 12, height: 12, borderRadius: 2,
                  background: getHeatColor(count), cursor: "pointer",
                  transition: "transform 0.1s",
                  transform: hovered?.i === i ? "scale(1.3)" : "scale(1)",
                  outline: hovered?.i === i ? "1px solid #00e676" : "none"
                }}
              />
            ))}
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginTop: 12,
          fontSize: 9, color: "#4a5570", fontFamily: "monospace"
        }}>
          <span>Less</span>
          {[0, 1, 3, 5, 7].map(n => (
            <div key={n} style={{
              width: 12, height: 12, borderRadius: 2,
              background: getHeatColor(n)
            }} />
          ))}
          <span>More</span>
          {hovered && (
            <span style={{ marginLeft: 12, color: "#00e676" }}>
              {hovered.count} commit{hovered.count !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CONTRIBUTOR BREAKDOWN ────────────────────────────────────────────────────
function ContributorBreakdown({ contributors }) {
  return (
    <div style={{
      background: "#111620", border: "1px solid #1e2535",
      borderRadius: 8, overflow: "hidden", marginBottom: 20
    }}>
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid #1e2535",
        background: "#0e1117"
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e8edf5" }}>
          Contributors
        </div>
        <div style={{
          fontSize: 10, color: "#4a5570",
          fontFamily: "monospace", marginTop: 2
        }}>
          commit share & code impact per author
        </div>
      </div>
      <div style={{ padding: "16px" }}>
        <div style={{
          height: 8, borderRadius: 4, overflow: "hidden",
          display: "flex", marginBottom: 20
        }}>
          {contributors.map(c => (
            <div key={c.name} style={{
              width: `${c.pct}%`, height: "100%",
              background: getAuthorColor(c.name),
              transition: "width 0.6s ease"
            }} />
          ))}
        </div>
        <div style={{
          display: "flex", flexDirection: "column", gap: 16
        }}>
          {contributors.map(c => {
            const color = getAuthorColor(c.name)
            return (
              <div key={c.name}>
                <div style={{
                  display: "flex", alignItems: "center",
                  gap: 12, marginBottom: 8
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: `${color}18`,
                    border: `1px solid ${color}44`,
                    display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 11,
                    fontWeight: 700, color, fontFamily: "monospace",
                    flexShrink: 0
                  }}>
                    {getInitials(c.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: "#e8edf5", marginBottom: 2
                    }}>
                      {c.name}
                    </div>
                    <div style={{
                      fontSize: 10, color: "#4a5570",
                      fontFamily: "monospace"
                    }}>
                      {c.commits} commits
                    </div>
                  </div>
                  <div style={{
                    fontSize: 16, fontWeight: 800,
                    color, fontFamily: "monospace"
                  }}>
                    {c.pct}%
                  </div>
                </div>
                <div style={{
                  height: 5, background: "#0a0c0f",
                  borderRadius: 3, overflow: "hidden", marginBottom: 10
                }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    background: color, width: `${c.pct}%`,
                    transition: "width 0.6s ease",
                    boxShadow: `0 0 6px ${color}66`
                  }} />
                </div>
                <div style={{
                  display: "flex", gap: 16,
                  fontFamily: "monospace", fontSize: 11
                }}>
                  <span style={{ color: "#00e676" }}>
                    +{c.additions.toLocaleString()} added
                  </span>
                  <span style={{ color: "#ff4444" }}>
                    -{c.deletions.toLocaleString()} removed
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── FILE CHURN ───────────────────────────────────────────────────────────────
function FileChurnChart({ files }) {
  const maxTotal = Math.max(...files.map(f => f.additions + f.deletions), 1)
  return (
    <div style={{
      background: "#111620", border: "1px solid #1e2535",
      borderRadius: 8, overflow: "hidden", marginBottom: 20
    }}>
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid #1e2535",
        background: "#0e1117"
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e8edf5" }}>
          File Churn
        </div>
        <div style={{
          fontSize: 10, color: "#4a5570",
          fontFamily: "monospace", marginTop: 2
        }}>
          most frequently changed files
        </div>
      </div>
      <div style={{ padding: "16px" }}>
        {files.map(f => {
          const total  = f.additions + f.deletions
          const addPct = total ? (f.additions / total) * 100 : 0
          const delPct = total ? (f.deletions / total) * 100 : 0
          const barW   = (total / maxTotal) * 100
          return (
            <div key={f.file} style={{ marginBottom: 14 }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 5
              }}>
                <div style={{
                  fontSize: 11, color: "#e8edf5",
                  fontFamily: "monospace",
                  overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap", maxWidth: "60%"
                }}>
                  {f.file.split("/").pop()}
                </div>
                <div style={{
                  display: "flex", gap: 8,
                  fontFamily: "monospace", fontSize: 10
                }}>
                  <span style={{ color: "#00e676" }}>+{f.additions}</span>
                  <span style={{ color: "#ff4444" }}>-{f.deletions}</span>
                  <span style={{ color: "#4a5570" }}>{f.commits}c</span>
                </div>
              </div>
              <div style={{
                height: 7, background: "#0a0c0f",
                borderRadius: 4, overflow: "hidden"
              }}>
                <div style={{
                  height: "100%", width: `${barW}%`,
                  display: "flex", borderRadius: 4, overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%", width: `${addPct}%`,
                    background: "#00e676"
                  }} />
                  <div style={{
                    height: "100%", width: `${delPct}%`,
                    background: "#ff4444"
                  }} />
                </div>
              </div>
              <div style={{
                fontSize: 9, color: "#2e3d5a",
                fontFamily: "monospace", marginTop: 3
              }}>
                {f.file}
              </div>
            </div>
          )
        })}
        <div style={{
          display: "flex", gap: 16, marginTop: 8,
          fontSize: 10, color: "#4a5570", fontFamily: "monospace"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 10, height: 10, borderRadius: 2, background: "#00e676"
            }} />
            Additions
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 10, height: 10, borderRadius: 2, background: "#ff4444"
            }} />
            Deletions
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── COMMIT ROW ───────────────────────────────────────────────────────────────
function CommitRow({ commit, isExpanded, onToggle }) {
  const authorColor = getAuthorColor(commit.author)
  return (
    <>
      <tr
        onClick={onToggle}
        style={{ cursor: "pointer", transition: "background 0.1s" }}
        onMouseEnter={e => e.currentTarget.style.background = "#171e2c"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <td style={{
          padding: "10px 14px", borderBottom: "1px solid #1e2535"
        }}>
          <span style={{
            fontFamily: "monospace", fontSize: 11,
            color: "#00e5ff", letterSpacing: "0.05em"
          }}>
            {commit.hash}
          </span>
        </td>
        <td style={{
          padding: "10px 14px", borderBottom: "1px solid #1e2535",
          maxWidth: 320
        }}>
          <div style={{
            fontSize: 12, color: "#e8edf5",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
          }}>
            {commit.message}
          </div>
        </td>
        <td style={{
          padding: "10px 14px", borderBottom: "1px solid #1e2535"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: `${authorColor}22`,
              border: `1px solid ${authorColor}44`,
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 9,
              fontWeight: 700, color: authorColor,
              fontFamily: "monospace", flexShrink: 0
            }}>
              {getInitials(commit.author)}
            </div>
            <span style={{ fontSize: 11, color: "#8a95b0" }}>
              {commit.author}
            </span>
          </div>
        </td>
        <td style={{
          padding: "10px 14px", borderBottom: "1px solid #1e2535"
        }}>
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 4,
            fontFamily: "monospace",
            background: commit.branch === "main" ? "#00e67618" : "#9c6fff18",
            color: commit.branch === "main" ? "#00e676" : "#9c6fff",
          }}>
            {commit.branch}
          </span>
        </td>
        <td style={{
          padding: "10px 14px", borderBottom: "1px solid #1e2535"
        }}>
          <div style={{
            display: "flex", gap: 8,
            fontFamily: "monospace", fontSize: 11
          }}>
            <span style={{ color: "#00e676" }}>+{commit.additions}</span>
            <span style={{ color: "#ff4444" }}>-{commit.deletions}</span>
          </div>
        </td>
        <td style={{
          padding: "10px 14px", borderBottom: "1px solid #1e2535"
        }}>
          <span style={{
            fontSize: 11, color: "#4a5570", fontFamily: "monospace"
          }}>
            {commit.date}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} style={{
            padding: "0 14px 12px",
            borderBottom: "1px solid #1e2535",
            background: "#0e1117"
          }}>
            <div style={{
              padding: "12px 14px", borderRadius: 8,
              background: "#0a0c0f", border: "1px solid #1e2535",
              display: "flex", gap: 32,
              fontFamily: "monospace", fontSize: 11
            }}>
              <div>
                <div style={{
                  color: "#4a5570", fontSize: 9, textTransform: "uppercase",
                  letterSpacing: "0.1em", marginBottom: 4
                }}>Full Hash</div>
                <div style={{ color: "#00e5ff" }}>
                  {commit.fullHash || commit.hash + "a7f3b2c9e1d"}
                </div>
              </div>
              <div>
                <div style={{
                  color: "#4a5570", fontSize: 9, textTransform: "uppercase",
                  letterSpacing: "0.1em", marginBottom: 4
                }}>Email</div>
                <div style={{ color: "#8a95b0" }}>{commit.email}</div>
              </div>
              <div>
                <div style={{
                  color: "#4a5570", fontSize: 9, textTransform: "uppercase",
                  letterSpacing: "0.1em", marginBottom: 4
                }}>Files Changed</div>
                <div style={{ color: "#ffb300" }}>
                  {commit.filesChanged} file{commit.filesChanged !== 1 ? "s" : ""}
                </div>
              </div>
              <div>
                <div style={{
                  color: "#4a5570", fontSize: 9, textTransform: "uppercase",
                  letterSpacing: "0.1em", marginBottom: 4
                }}>Net Change</div>
                <div style={{
                  color: commit.additions - commit.deletions >= 0
                    ? "#00e676" : "#ff4444"
                }}>
                  {commit.additions - commit.deletions >= 0 ? "+" : ""}
                  {commit.additions - commit.deletions} lines
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── COMMITS TABLE ────────────────────────────────────────────────────────────
function CommitsTable({ commits }) {
  const [expanded, setExpanded] = React.useState(null)
  const [search, setSearch]     = React.useState("")
  const [filter, setFilter]     = React.useState("all")

  const branches = ["all", ...new Set(commits.map(c => c.branch))]

  const filtered = commits.filter(c => {
    const matchSearch =
      c.message.toLowerCase().includes(search.toLowerCase()) ||
      c.author.toLowerCase().includes(search.toLowerCase()) ||
      c.hash.toLowerCase().includes(search.toLowerCase())
    const matchBranch = filter === "all" || c.branch === filter
    return matchSearch && matchBranch
  })

  const thStyle = {
    padding: "9px 14px", textAlign: "left",
    fontFamily: "monospace", fontSize: 9,
    textTransform: "uppercase", letterSpacing: "0.1em",
    color: "#4a5570", borderBottom: "1px solid #1e2535",
    fontWeight: 400, background: "#0e1117"
  }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 15, fontWeight: 700, color: "#e8edf5", marginBottom: 2
        }}>
          Recent Commits
        </div>
        <div style={{
          fontSize: 10, color: "#4a5570", fontFamily: "monospace"
        }}>
          click any row to expand details
        </div>
      </div>
      <div style={{
        display: "flex", gap: 10, marginBottom: 12, alignItems: "center"
      }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{
            position: "absolute", left: 10, top: "50%",
            transform: "translateY(-50%)", color: "#4a5570", fontSize: 12
          }}>🔍</span>
          <input
            placeholder="Search commits, authors, hashes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px 8px 32px",
              background: "#111620", border: "1px solid #1e2535",
              borderRadius: 6, color: "#e8edf5",
              fontFamily: "monospace", fontSize: 11,
              outline: "none", boxSizing: "border-box"
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {branches.map(b => (
            <button key={b} onClick={() => setFilter(b)} style={{
              padding: "6px 12px", borderRadius: 6, border: "1px solid",
              borderColor: filter === b ? "#9c6fff" : "#1e2535",
              background: filter === b ? "#9c6fff18" : "transparent",
              color: filter === b ? "#9c6fff" : "#4a5570",
              cursor: "pointer", fontSize: 11,
              fontFamily: "monospace", transition: "all 0.15s"
            }}>
              {b}
            </button>
          ))}
        </div>
      </div>
      <div style={{
        background: "#111620", border: "1px solid #1e2535",
        borderRadius: 8, overflow: "hidden"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Hash</th>
              <th style={thStyle}>Message</th>
              <th style={thStyle}>Author</th>
              <th style={thStyle}>Branch</th>
              <th style={thStyle}>Changes</th>
              <th style={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{
                  padding: 32, textAlign: "center",
                  color: "#4a5570", fontFamily: "monospace", fontSize: 12
                }}>
                  No commits match your search
                </td>
              </tr>
            ) : filtered.map(commit => (
              <CommitRow
                key={commit.hash}
                commit={commit}
                isExpanded={expanded === commit.hash}
                onToggle={() => setExpanded(
                  expanded === commit.hash ? null : commit.hash
                )}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div style={{
        marginTop: 8, fontSize: 10,
        color: "#4a5570", fontFamily: "monospace"
      }}>
        {filtered.length} of {commits.length} commits
      </div>
    </div>
  )
}

// ─── SOURCE BADGE ─────────────────────────────────────────────────────────────
function SourceBadge({ isLive }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      fontSize: 10, fontFamily: "monospace", padding: "4px 10px",
      borderRadius: 20,
      background: isLive ? "#00e67618" : "#ffb30018",
      border: `1px solid ${isLive ? "#00e67633" : "#ffb30033"}`,
      color: isLive ? "#00e676" : "#ffb300"
    }}>
      <div style={{
        width: 5, height: 5, borderRadius: "50%",
        background: isLive ? "#00e676" : "#ffb300",
        boxShadow: `0 0 5px ${isLive ? "#00e676" : "#ffb300"}`
      }} />
      {isLive ? "live git data" : "mock data"}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function GitActivity() {
  const { files } = useProjectStore()

  const [gitData,  setGitData]  = React.useState(null)
  const [loading,  setLoading]  = React.useState(false)
  const [error,    setError]    = React.useState(null)
  const [heatmap,  setHeatmap]  = React.useState(() => generateHeatmap())

  // When files load, try to fetch real git data
  React.useEffect(() => {
    if (!files || files.length === 0) return
    if (!window.electronAPI?.getGitData) return

    // Get project root from first file path
    const firstPath = files[0]?.path || ""
    if (!firstPath) return

    // Walk up to find project root
    const parts = firstPath.replace(/\\/g, "/").split("/")
    const root  = parts.slice(0, -2).join("/") || firstPath

    setLoading(true)
    setError(null)

    window.electronAPI.getGitData(root)
      .then(data => {
        if (data) {
          setGitData(data)
          setHeatmap(data.heatmap)
        } else {
          setError("No git repository found in this project folder.")
        }
      })
      .catch(err => {
        setError("Could not read git data: " + err.message)
      })
      .finally(() => setLoading(false))
  }, [files.length])

  // Use real data if available, fallback to mock
  const stats        = gitData?.stats        || MOCK_STATS
  const commits      = gitData?.commits      || MOCK_COMMITS
  const contributors = gitData?.contributors || MOCK_CONTRIBUTORS
  const churnFiles   = gitData?.churnFiles   || MOCK_CHURN
  const isLive       = !!gitData

  return (
    <div style={{
      padding: 24, background: "#0a0c0f",
      minHeight: "100%", color: "#e8edf5"
    }}>

      {/* HEADER */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", marginBottom: 24
      }}>
        <div>
          <h2 style={{
            fontSize: 20, fontWeight: 700,
            margin: 0, marginBottom: 4
          }}>
            Git Activity
          </h2>
          <div style={{
            fontSize: 11, color: "#4a5570", fontFamily: "monospace"
          }}>
            // commit history, contributors & code churn
          </div>
        </div>
        <SourceBadge isLive={isLive} />
      </div>

      {/* LOADING */}
      {loading && (
        <div style={{
          padding: "12px 16px", borderRadius: 8, marginBottom: 20,
          background: "#00e5ff08", border: "1px solid #00e5ff22",
          fontSize: 12, color: "#00e5ff", fontFamily: "monospace"
        }}>
          ⏳ Reading git history...
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div style={{
          padding: "12px 16px", borderRadius: 8, marginBottom: 20,
          background: "#ffb30010", border: "1px solid #ffb30033",
          borderLeft: "3px solid #ffb300",
          fontSize: 12, color: "#ffb300", fontFamily: "monospace"
        }}>
          ⚠️ {error} Showing mock data instead.
        </div>
      )}

      {/* STATS ROW */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Commits"  value={stats.totalCommits} color="#00e676" />
        <StatCard label="Contributors"   value={stats.contributors} color="#00e5ff" />
        <StatCard label="This Week"      value={stats.thisWeek}     color="#9c6fff" sub="commits" />
        <StatCard label="Files Changed"  value={stats.filesChanged} color="#ffb300" sub="last 30 days" />
      </div>

      {/* BRANCH + CHURN */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <div style={{
          flex: 1, background: "#111620",
          border: "1px solid #1e2535", borderRadius: 8,
          padding: "14px 20px",
          display: "flex", alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{
              fontSize: 10, textTransform: "uppercase",
              letterSpacing: "0.12em", color: "#4a5570",
              fontFamily: "monospace", marginBottom: 4
            }}>
              Active Branch
            </div>
            <div style={{
              fontSize: 16, fontWeight: 700,
              color: "#e8edf5", fontFamily: "monospace"
            }}>
              {stats.activeBranch}
            </div>
          </div>
          <div style={{
            fontSize: 10, color: "#4a5570", fontFamily: "monospace"
          }}>
            last commit: {stats.lastCommit}
          </div>
        </div>
        <div style={{
          flex: 1, background: "#111620",
          border: "1px solid #1e2535", borderRadius: 8,
          padding: "14px 20px",
          display: "flex", gap: 24, alignItems: "center"
        }}>
          <div>
            <div style={{
              fontSize: 10, textTransform: "uppercase",
              letterSpacing: "0.12em", color: "#4a5570",
              fontFamily: "monospace", marginBottom: 4
            }}>
              Additions
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#00e676" }}>
              +{stats.additions.toLocaleString()}
            </div>
          </div>
          <div style={{ width: 1, height: 32, background: "#1e2535" }} />
          <div>
            <div style={{
              fontSize: 10, textTransform: "uppercase",
              letterSpacing: "0.12em", color: "#4a5570",
              fontFamily: "monospace", marginBottom: 4
            }}>
              Deletions
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#ff4444" }}>
              -{stats.deletions.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* HEATMAP */}
      <Heatmap data={heatmap} />

      {/* CONTRIBUTOR + CHURN */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <ContributorBreakdown contributors={contributors} />
        </div>
        <div style={{ flex: 1 }}>
          <FileChurnChart files={churnFiles} />
        </div>
      </div>

      {/* COMMITS TABLE */}
      <CommitsTable commits={commits} />

    </div>
  )
}