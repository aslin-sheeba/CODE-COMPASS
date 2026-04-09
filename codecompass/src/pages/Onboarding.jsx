import React from "react"
import { useProjectStore } from "../state/projectStore"
import { T } from "../theme"
import { basename, extname, getExtColor, getStressColor } from "../utils"

// ── Helpers ───────────────────────────────────────────────────────────────────
function plural(n, word) { return `${n} ${word}${n !== 1 ? "s" : ""}` }
function normPath(p = "") { return (p || "").replace(/\\/g, "/") }
function getDir(p) { const parts = normPath(p).split("/"); return parts.slice(0, -1).join("/") || "." }
function isExternal(imp) { return imp && !imp.startsWith(".") && !imp.startsWith("/") }

function langFromExt(ext) {
  return { js:"JavaScript", jsx:"React/JSX", ts:"TypeScript", tsx:"React/TSX",
           py:"Python", rs:"Rust", go:"Go", rb:"Ruby", java:"Java",
           css:"CSS", html:"HTML", json:"JSON", md:"Markdown" }[ext] || ext?.toUpperCase() || "Unknown"
}

function uniq(arr) { return [...new Set(arr)] }

// ── Section label ─────────────────────────────────────────────────────────────
function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: T.textHint, fontWeight: 600 }}>{children}</div>
      {sub && <div style={{ fontSize: 11, color: T.textSub, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ── Small stat card ───────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rMd, padding: "12px 16px", flex: 1, borderTop: `2px solid ${color}`, minWidth: 0 }}>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "monospace", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: T.textHint, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Checklist item ────────────────────────────────────────────────────────────
function CheckItem({ done, children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: done ? T.brandLight : T.surfaceAlt, border: `1px solid ${done ? T.brandBorder : T.border}` }}>
        {done && <span style={{ fontSize: 10, color: T.brand }}>✓</span>}
      </div>
      <div style={{ fontSize: 12, color: done ? T.textSub : T.text, lineHeight: 1.6, textDecoration: done ? "line-through" : "none" }}>{children}</div>
    </div>
  )
}

// ── File row in key-files list ────────────────────────────────────────────────
function FileRow({ file, rank, onSelect }) {
  const [hov, setHov] = React.useState(false)
  const stress = file._meta?.stressScore || 0
  const ext = extname(file.path)
  const color = getExtColor(file.path)
  return (
    <div onClick={() => onSelect && onSelect(file)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
        background: hov ? T.surfaceAlt : "transparent", borderRadius: T.r,
        cursor: "pointer", transition: "background 0.1s" }}>
      <div style={{ width: 22, height: 22, borderRadius: 5, background: `${color}18`, border: `1px solid ${color}44`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color, flexShrink: 0 }}>
        {ext.slice(0,3).toUpperCase() || "?"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {basename(file.path)}
        </div>
        <div style={{ fontSize: 10, color: T.textHint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {normPath(file.path)}
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: getStressColor(stress), fontFamily: "monospace" }}>{stress}</div>
        <div style={{ fontSize: 9, color: T.textHint }}>stress</div>
      </div>
    </div>
  )
}

// ── Directory tree summary ─────────────────────────────────────────────────────
function DirectoryMap({ files }) {
  const dirs = React.useMemo(() => {
    const map = {}
    for (const f of files) {
      const dir = normPath(f.path).split("/").slice(0, -1).join("/") || "root"
      const top = dir.split("/")[0] || "root"
      map[top] = (map[top] || 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [files])

  const max = dirs[0]?.[1] || 1

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {dirs.map(([dir, count]) => (
        <div key={dir} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, fontFamily: "monospace", color: T.textSub, width: 120, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dir}/</div>
          <div style={{ flex: 1, height: 6, background: T.surfaceAlt, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: T.brand, borderRadius: 3, transition: "width 0.6s ease" }} />
          </div>
          <div style={{ fontSize: 10, color: T.textHint, fontFamily: "monospace", width: 28, textAlign: "right" }}>{count}</div>
        </div>
      ))}
    </div>
  )
}

// ── Language breakdown ─────────────────────────────────────────────────────────
function LanguageBreakdown({ files }) {
  const langs = React.useMemo(() => {
    const map = {}
    for (const f of files) {
      const ext = extname(f.path)
      if (!ext) continue
      map[ext] = (map[ext] || 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [files])

  const total = langs.reduce((s, [, n]) => s + n, 0) || 1
  const colors = [T.teal, T.blue, T.orange, T.green, "#8b5cf6", T.red]

  return (
    <div>
      <div style={{ height: 8, borderRadius: 4, overflow: "hidden", display: "flex", marginBottom: 12 }}>
        {langs.map(([ext, count], i) => (
          <div key={ext} style={{ width: `${(count / total) * 100}%`, background: colors[i % colors.length], transition: "width 0.6s" }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {langs.map(([ext, count], i) => (
          <div key={ext} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: T.textSub, fontFamily: "monospace" }}>
              {langFromExt(ext)} <span style={{ color: T.textHint }}>({Math.round((count / total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Key concepts / glossary entry ─────────────────────────────────────────────
function GlossaryEntry({ term, desc, badge, badgeColor }) {
  return (
    <div style={{ padding: "10px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: "monospace" }}>{term}</span>
          {badge && <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 10, background: `${badgeColor}18`, border: `1px solid ${badgeColor}44`, color: badgeColor, fontWeight: 600 }}>{badge}</span>}
        </div>
        <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const { files, selectFile } = useProjectStore()
  const [activeSection, setActiveSection] = React.useState("overview")
  const [checks, setChecks] = React.useState({})

  const toggleCheck = (key) => setChecks(p => ({ ...p, [key]: !p[key] }))

  // ── Derived data ───────────────────────────────────────────────────────────
  const stats = React.useMemo(() => {
    if (!files.length) return null
    const exts = new Set(files.map(f => extname(f.path)).filter(Boolean))
    const topStressed = [...files].sort((a, b) => (b._meta?.stressScore || 0) - (a._meta?.stressScore || 0)).slice(0, 5)
    const entryPoints = files.filter(f => {
      const name = basename(f.path).toLowerCase()
      return name === "index.js" || name === "index.jsx" || name === "main.js" || name === "main.jsx" ||
             name === "app.js" || name === "app.jsx" || name === "app.tsx" || name === "main.ts" || name === "index.ts"
    })
    const externalPkgs = uniq(
      files.flatMap(f => (f.imports || []).filter(isExternal))
    ).slice(0, 20)
    const highCoupling = files.filter(f => (f._meta?.stressScore || 0) > 15)
    const totalImports = files.reduce((s, f) => s + (f._meta?.importCount || 0), 0)
    return { exts, topStressed, entryPoints, externalPkgs, highCoupling, totalImports }
  }, [files])

  const NAV = [
    { id: "overview",      label: "📊 Overview" },
    { id: "structure",     label: "📁 Structure" },
    { id: "keyfiles",      label: "🔥 Key Files" },
    { id: "dependencies",  label: "📦 Dependencies" },
    { id: "checklist",     label: "✅ Checklist" },
    { id: "glossary",      label: "📖 Glossary" },
  ]

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!files.length) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 40, background: T.bg, color: T.text, fontFamily: "monospace" }}>
        <div style={{ fontSize: 40 }}>🧭</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>No project loaded</div>
        <div style={{ fontSize: 12, color: T.textSub, textAlign: "center", lineHeight: 1.7, maxWidth: 380 }}>
          Import a project using the button in the top bar to generate your personalized onboarding guide.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", height: "100%", background: T.bg, color: T.text, fontFamily: "monospace" }}>

      {/* Sidebar nav */}
      <div style={{ width: 180, flexShrink: 0, borderRight: `1px solid ${T.border}`, background: T.surface, display: "flex", flexDirection: "column", padding: "16px 0" }}>
        <div style={{ padding: "0 14px 14px", borderBottom: `1px solid ${T.border}`, marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>onboarding</div>
          <div style={{ fontSize: 10, color: T.textHint, marginTop: 2 }}>developer guide</div>
        </div>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setActiveSection(n.id)} style={{
            padding: "8px 14px", border: "none", background: activeSection === n.id ? T.brandLight : "transparent",
            color: activeSection === n.id ? T.brand : T.textSub, textAlign: "left", cursor: "pointer",
            fontSize: 12, fontFamily: "monospace", fontWeight: activeSection === n.id ? 600 : 400,
            borderLeft: `2px solid ${activeSection === n.id ? T.brand : "transparent"}`,
            transition: "all 0.1s",
          }}>{n.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>

        {/* ── Overview ──────────────────────────────────────────────────── */}
        {activeSection === "overview" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>Project Overview</div>
              <div style={{ fontSize: 11, color: T.textHint }}>auto-generated from scanned source files</div>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <StatCard label="Total Files" value={files.length} color={T.blue} sub="scanned source files" />
              <StatCard label="Languages" value={stats.exts.size} color={T.teal} sub={[...stats.exts].slice(0,3).join(", ")} />
              <StatCard label="High Coupling" value={stats.highCoupling.length} color={T.orange} sub="stress score > 15" />
              <StatCard label="Ext. Packages" value={stats.externalPkgs.length} color="#8b5cf6" sub="unique imports" />
            </div>

            {/* Language breakdown */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rMd, padding: "14px 16px", marginBottom: 16 }}>
              <SectionTitle>Language Breakdown</SectionTitle>
              <LanguageBreakdown files={files} />
            </div>

            {/* Entry points */}
            {stats.entryPoints.length > 0 && (
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rMd, padding: "14px 16px", marginBottom: 16 }}>
                <SectionTitle children="Entry Points" sub="Files where the app starts — start reading here" />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {stats.entryPoints.map(f => (
                    <div key={f.path} onClick={() => selectFile(f)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: T.r, background: T.brandLight, border: `1px solid ${T.brandBorder}`, cursor: "pointer" }}>
                      <span style={{ fontSize: 12 }}>▶</span>
                      <span style={{ fontSize: 12, fontFamily: "monospace", color: T.brand, fontWeight: 600 }}>{normPath(f.path)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick tips */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rMd, padding: "14px 16px" }}>
              <SectionTitle children="Quick Tips" sub="How to use CodeCompass for onboarding" />
              {[
                ["🗺️ Architecture tab", "See the full import dependency graph. Nodes with many edges are your hotspots."],
                ["🔍 Search tab",       "Full-text search across all files. Great for finding where something is defined."],
                ["📦 Dependency Lens",  "Check if any npm/pip/cargo packages are outdated or deprecated."],
                ["🤖 AI Assistant",     "Ask natural language questions about the codebase — powered by Groq."],
                ["🔥 Key Files below",  "Files with the highest stress scores are the most coupled — review them first."],
              ].map(([title, desc]) => (
                <div key={title} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{title.split(" ")[0]}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2 }}>{title.split(" ").slice(1).join(" ")}</div>
                    <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Structure ─────────────────────────────────────────────────── */}
        {activeSection === "structure" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>Directory Structure</div>
              <div style={{ fontSize: 11, color: T.textHint }}>top-level folders by file count</div>
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rMd, padding: "14px 16px", marginBottom: 16 }}>
              <SectionTitle children="Folder Map" sub="Each bar = number of files in that top-level directory" />
              <DirectoryMap files={files} />
            </div>

            {/* Most-imported directories */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rMd, padding: "14px 16px" }}>
              <SectionTitle children="Structural Hotspots" sub="Files that appear most frequently as import targets" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {stats.topStressed.map((f, i) => (
                  <div key={f.path} onClick={() => selectFile(f)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: T.r,
                      background: T.surfaceAlt, border: `1px solid ${T.border}`, cursor: "pointer" }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: T.brandLight, border: `1px solid ${T.brandBorder}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: T.brand }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontFamily: "monospace", color: T.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {basename(f.path)}
                      </div>
                      <div style={{ fontSize: 10, color: T.textHint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {normPath(f.path)}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: getStressColor(f._meta?.stressScore || 0) }}>
                        {f._meta?.stressScore || 0}
                      </div>
                      <div style={{ fontSize: 9, color: T.textHint }}>stress</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Key Files ─────────────────────────────────────────────────── */}
        {activeSection === "keyfiles" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>Key Files</div>
              <div style={{ fontSize: 11, color: T.textHint }}>ranked by stress score (import coupling + fan-in)</div>
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rMd, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textHint, fontWeight: 600 }}>
                  Top {Math.min(files.length, 20)} most coupled files
                </span>
                <span style={{ fontSize: 10, color: T.textHint }}>click a file to preview it</span>
              </div>
              {[...files].sort((a, b) => (b._meta?.stressScore || 0) - (a._meta?.stressScore || 0)).slice(0, 20).map((f, i) => (
                <FileRow key={f.path} file={f} rank={i + 1} onSelect={selectFile} />
              ))}
            </div>

            {/* High coupling warning */}
            {stats.highCoupling.length > 0 && (
              <div style={{ padding: "12px 14px", borderRadius: T.rMd, background: T.orangeLight, border: `1px solid ${T.orangeBorder}`, borderLeft: `3px solid ${T.orange}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.orange, marginBottom: 4 }}>
                  ⚠ {plural(stats.highCoupling.length, "file")} with high coupling (stress &gt; 15)
                </div>
                <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.6 }}>
                  These files are imported by many others. Changes here carry high risk.
                  Consider splitting responsibilities or introducing interface abstractions.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Dependencies ──────────────────────────────────────────────── */}
        {activeSection === "dependencies" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>External Dependencies</div>
              <div style={{ fontSize: 11, color: T.textHint }}>packages imported across the codebase</div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <StatCard label="Unique Packages" value={stats.externalPkgs.length} color={T.blue} />
              <StatCard label="Total Imports" value={stats.totalImports} color={T.teal} sub="across all files" />
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rMd, padding: "14px 16px", marginBottom: 16 }}>
              <SectionTitle children="Detected External Packages" sub="Unique package names found in import statements" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {stats.externalPkgs.map(pkg => (
                  <span key={pkg} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: "monospace",
                    background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.textSub }}>
                    {pkg}
                  </span>
                ))}
                {stats.externalPkgs.length === 0 && (
                  <span style={{ fontSize: 11, color: T.textHint }}>No external packages detected in import statements.</span>
                )}
              </div>
            </div>

            <div style={{ padding: "12px 14px", borderRadius: T.rMd, background: T.brandLight, border: `1px solid ${T.brandBorder}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.brand, marginBottom: 4 }}>💡 Full package analysis</div>
              <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.6 }}>
                Switch to the <strong>Dependency Lens</strong> tab for a complete package risk analysis — including
                installed vs. latest versions, deprecated packages, and update recommendations for npm, pip, cargo, gem, and more.
              </div>
            </div>
          </div>
        )}

        {/* ── Checklist ─────────────────────────────────────────────────── */}
        {activeSection === "checklist" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>New Developer Checklist</div>
              <div style={{ fontSize: 11, color: T.textHint }}>track your onboarding progress</div>
            </div>

            {[
              {
                title: "Understanding the codebase",
                items: [
                  ["read_overview",    "Read the project README and understand its purpose"],
                  ["explore_entry",    "Find and open the entry point file (main.js / App.jsx)"],
                  ["trace_flow",       "Trace a single user-facing feature from UI to data layer"],
                  ["review_arch",      "Open the Architecture tab and study the dependency graph"],
                  ["id_hotspots",      "Identify the top 3 high-stress files and understand why they're coupled"],
                ]
              },
              {
                title: "Dev environment setup",
                items: [
                  ["clone_repo",       "Clone the repository locally"],
                  ["install_deps",     "Install all dependencies (npm install / pip install / etc.)"],
                  ["run_dev",          "Run the development server successfully"],
                  ["run_tests",        "Run the test suite and confirm all tests pass"],
                  ["check_env",        "Set up required .env variables (check .env.example if present)"],
                ]
              },
              {
                title: "First contributions",
                items: [
                  ["first_bug",        "Fix or reproduce a simple bug from the issue tracker"],
                  ["write_test",       "Write a test for an untested file or function"],
                  ["code_review",      "Submit a pull request and go through code review"],
                  ["review_others",    "Review someone else's pull request with useful feedback"],
                  ["dep_lens",         "Check Dependency Lens for any critical or high-risk packages"],
                ]
              },
              {
                title: "Team integration",
                items: [
                  ["meet_team",        "Meet each team member and understand their areas"],
                  ["slack_channels",   "Join relevant communication channels or group chats"],
                  ["read_contrib",     "Read CONTRIBUTING.md or equivalent contribution guide"],
                  ["ask_questions",    "Ask at least 3 questions you couldn't find answers to in the docs"],
                ]
              },
            ].map(({ title, items }) => (
              <div key={title} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rMd, padding: "14px 16px", marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 10 }}>{title}</div>
                {items.map(([key, label]) => (
                  <div key={key} onClick={() => toggleCheck(key)} style={{ cursor: "pointer" }}>
                    <CheckItem done={!!checks[key]}>{label}</CheckItem>
                  </div>
                ))}
              </div>
            ))}

            {/* Progress */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rMd, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>Overall Progress</span>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: T.brand }}>
                  {Object.values(checks).filter(Boolean).length} / 19
                </span>
              </div>
              <div style={{ height: 6, background: T.surfaceAlt, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: T.brand, transition: "width 0.4s ease",
                  width: `${(Object.values(checks).filter(Boolean).length / 19) * 100}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Glossary ──────────────────────────────────────────────────── */}
        {activeSection === "glossary" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>Glossary</div>
              <div style={{ fontSize: 11, color: T.textHint }}>CodeCompass terms and key concepts</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <GlossaryEntry term="Stress Score" badge="metric" badgeColor={T.orange}
                desc="A composite metric calculated from a file's import count, local-import ratio, and how many other files import it (incoming). Higher = more coupled and riskier to change." />
              <GlossaryEntry term="Fan-out" badge="metric" badgeColor={T.blue}
                desc="The number of external packages a file imports. High fan-out means many third-party dependencies — can be a maintenance burden." />
              <GlossaryEntry term="Fan-in (incoming)" badge="metric" badgeColor={T.teal}
                desc="How many other files import this one. A file with high fan-in is a 'core module' — changing it affects many dependents." />
              <GlossaryEntry term="Coupling" badge="concept" badgeColor={T.text}
                desc="When two modules depend on each other directly. High coupling makes refactoring harder. Low coupling + high cohesion is the goal." />
              <GlossaryEntry term="Dependency Graph" badge="feature" badgeColor={T.brand}
                desc="A directed graph where nodes are files and edges are import relationships. Shown in the Architecture tab. Cycles in this graph indicate circular dependencies." />
              <GlossaryEntry term="Circular Dependency" badge="anti-pattern" badgeColor={T.red}
                desc="When file A imports B and B imports A (directly or transitively). Can cause initialisation bugs. Shown as highlighted cycles in the Architecture graph." />
              <GlossaryEntry term="Entry Point" badge="concept" badgeColor={T.green}
                desc="The file where execution starts — typically index.js, main.jsx, or App.jsx. Good place to begin reading an unfamiliar codebase." />
              <GlossaryEntry term="Unused File" badge="warning" badgeColor={T.amber}
                desc="A file that is never imported by any other file in the project. May be dead code, a test fixture, or a standalone script. Shown in the dashboard sidebar." />
              <GlossaryEntry term="IPC" badge="electron" badgeColor={T.blue}
                desc="Inter-Process Communication. In Electron apps, IPC is how the renderer (React UI) communicates with the main process (Node.js). Uses ipcMain / ipcRenderer." />
              <GlossaryEntry term="Groq" badge="ai" badgeColor="#8b5cf6"
                desc="The AI inference provider powering the AI Assistant. Uses llama-3.1-8b-instant for fast, low-latency responses. Requires a VITE_GROQ_API_KEY environment variable." />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}