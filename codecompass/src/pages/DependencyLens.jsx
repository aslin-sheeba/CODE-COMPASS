import React from "react"
import { useProjectStore } from "../state/projectStore"

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function getRiskColor(risk) {
  if (risk === "critical") return "#ff4444"
  if (risk === "high")     return "#ff8800"
  if (risk === "medium")   return "#ffb300"
  return "#00e676"
}

function getEcoColor(eco) {
  const map = {
    npm: "#ff4444", pip: "#3b82f6", cargo: "#ffb300",
    gem: "#00e676", composer: "#9c6fff", go: "#00e5ff",
  }
  return map[eco] || "#4a5570"
}

function getFileName(p) {
  return (p || "").replace(/\\/g, "/").split("/").pop()
}

function isExtImp(imp) {
  return !imp.startsWith(".") && !imp.startsWith("/")
}

function cleanVer(v) {
  return (v || "").replace(/[\^~>=<*\s]/g, "").split(",")[0] || "unknown"
}

// ═══════════════════════════════════════════════════════════
// REGISTRY FETCHERS — called from renderer via fetch()
// ═══════════════════════════════════════════════════════════
async function fetchNpmInfo(name) {
  try {
    const r = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`, {
      headers: { "Accept": "application/json" }
    })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

async function fetchPypiInfo(name) {
  try {
    const r = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`)
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

async function fetchCratesInfo(name) {
  try {
    const r = await fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}`, {
      headers: { "User-Agent": "CodeCompass/1.0" }
    })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

async function fetchGemInfo(name) {
  try {
    const r = await fetch(`https://rubygems.org/api/v1/gems/${encodeURIComponent(name)}.json`)
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

// ═══════════════════════════════════════════════════════════
// RISK CALCULATOR
// ═══════════════════════════════════════════════════════════
function calcRisk(installed, latest, deprecated) {
  let score = 0
  const reasons = []

  if (deprecated) {
    score += 40
    reasons.push("Package is deprecated")
  }

  const cv = cleanVer(installed)
  const lv = cleanVer(latest || "")

  if (cv !== "unknown" && lv && cv !== lv) {
    const pi = cv.split(".").map(n => parseInt(n) || 0)
    const pl = lv.split(".").map(n => parseInt(n) || 0)
    const majorBehind = Math.max(0, (pl[0]||0) - (pi[0]||0))
    const minorBehind = Math.max(0, (pl[1]||0) - (pi[1]||0))

    if (majorBehind >= 2) {
      score += 35; reasons.push(`${majorBehind} major versions behind (${cv} → ${lv})`)
    } else if (majorBehind === 1) {
      score += 20; reasons.push(`1 major version behind (${cv} → ${lv})`)
    } else if (minorBehind >= 5) {
      score += 10; reasons.push(`${minorBehind} minor versions behind`)
    } else if (minorBehind > 0) {
      score += 3;  reasons.push("Minor/patch update available")
    }
  }

  let risk = "low"
  if (score >= 35)      risk = "critical"
  else if (score >= 20) risk = "high"
  else if (score >= 10) risk = "medium"

  return { score, risk, reasons }
}

// ═══════════════════════════════════════════════════════════
// PACKAGE PARSERS — extract from file content strings
// ═══════════════════════════════════════════════════════════
function parseNpmDeps(content) {
  try {
    const pkg  = JSON.parse(content)
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
    const dev  = new Set(Object.keys(pkg.devDependencies || {}))
    return Object.entries(deps).map(([name, ver]) => ({
      name, installed: cleanVer(ver), isDev: dev.has(name), ecosystem: "npm"
    }))
  } catch { return [] }
}

function parsePipDeps(content) {
  return content.split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#") && !l.startsWith("-"))
    .map(l => {
      const m = l.match(/^([A-Za-z0-9_.-]+)\s*(?:[>=<!~^]+\s*([^\s,;]+))?/)
      if (!m) return null
      return { name: m[1], installed: m[2] ? cleanVer(m[2]) : "unknown", isDev: false, ecosystem: "pip" }
    })
    .filter(Boolean)
}

function parseGemfileDeps(content) {
  return content.split("\n")
    .map(l => l.match(/^\s*gem\s+['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]+)['"])?/))
    .filter(Boolean)
    .map(m => ({ name: m[1], installed: m[2] ? cleanVer(m[2]) : "unknown", isDev: false, ecosystem: "gem" }))
}

function parseCargoDeps(content) {
  const section = content.match(/\[dependencies\]([\s\S]*?)(\[|$)/)?.[1] || ""
  return section.split("\n")
    .map(l => l.match(/^([a-zA-Z0-9_-]+)\s*=\s*["']?([^"',\n\s]+)/))
    .filter(Boolean)
    .map(m => ({ name: m[1], installed: cleanVer(m[2]), isDev: false, ecosystem: "cargo" }))
}

function parseGoMod(content) {
  const block = content.match(/require\s*\(([\s\S]*?)\)/)?.[1] || ""
  return block.split("\n")
    .map(l => l.trim().match(/^(\S+)\s+v?([^\s/]+)/))
    .filter(m => m && !m[1].startsWith("//"))
    .map(m => ({ name: m[1], installed: m[2], isDev: false, ecosystem: "go" }))
}

function parseComposerDeps(content) {
  try {
    const c   = JSON.parse(content)
    const all = { ...(c.require || {}), ...(c["require-dev"] || {}) }
    const dev = new Set(Object.keys(c["require-dev"] || {}))
    return Object.entries(all)
      .filter(([n]) => n !== "php" && !n.startsWith("ext-"))
      .map(([name, ver]) => ({ name, installed: cleanVer(ver), isDev: dev.has(name), ecosystem: "composer" }))
  } catch { return [] }
}

// ═══════════════════════════════════════════════════════════
// MAIN SCANNER — finds manifests in scanned files
// ═══════════════════════════════════════════════════════════
function isManifest(filePath, ...names) {
  const p = (filePath || "").replace(/\\/g, "/").toLowerCase()
  const base = p.split("/").pop()
  return names.some(n => base === n.toLowerCase() || base === n.toLowerCase().replace(/\.[^.]+$/, ""))
}

function extractPackagesFromFiles(files) {
  const allPackages = []

  for (const f of files) {
    const content = f.content || ""
    if (!content) continue

    // Try npm - package.json or normalized "package"
    if (isManifest(f.path, "package.json")) {
      try { allPackages.push(...parseNpmDeps(content)) } catch {}
    }
    // pip - requirements.txt
    else if (isManifest(f.path, "requirements.txt")) {
      try { allPackages.push(...parsePipDeps(content)) } catch {}
    }
    // Ruby - Gemfile (no extension, won't be normalized)
    else if (isManifest(f.path, "Gemfile")) {
      try { allPackages.push(...parseGemfileDeps(content)) } catch {}
    }
    // Rust - Cargo.toml or normalized "Cargo"
    else if (isManifest(f.path, "Cargo.toml")) {
      try { allPackages.push(...parseCargoDeps(content)) } catch {}
    }
    // Go - go.mod (no js extension so won't be in scan results normally)
    else if (isManifest(f.path, "go.mod")) {
      try { allPackages.push(...parseGoMod(content)) } catch {}
    }
    // PHP - composer.json or normalized "composer"
    else if (isManifest(f.path, "composer.json")) {
      try { allPackages.push(...parseComposerDeps(content)) } catch {}
    }
  }

  // Deduplicate by name+ecosystem
  const seen = new Set()
  return allPackages.filter(p => {
    const key = `${p.ecosystem}:${p.name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ═══════════════════════════════════════════════════════════
// REGISTRY ENRICHMENT — fetch latest version + risk
// ═══════════════════════════════════════════════════════════
async function enrichPackage(pkg) {
  try {
    let latest = null
    let deprecated = null
    let license = "unknown"
    let description = ""

    if (pkg.ecosystem === "npm") {
      const info = await fetchNpmInfo(pkg.name)
      latest      = info?.version || null
      deprecated  = typeof info?.deprecated === "string" ? info.deprecated : null
      license     = info?.license || "unknown"
      description = (info?.description || "").slice(0, 100)

    } else if (pkg.ecosystem === "pip") {
      const info  = await fetchPypiInfo(pkg.name)
      latest      = info?.info?.version || null
      license     = info?.info?.license || "unknown"
      description = (info?.info?.summary || "").slice(0, 100)
      const inactive = (info?.info?.classifiers || []).some(
        c => c.includes("Inactive") || c.includes("Abandoned")
      )
      if (inactive) deprecated = "Project marked inactive on PyPI"

    } else if (pkg.ecosystem === "cargo") {
      const info  = await fetchCratesInfo(pkg.name)
      latest      = info?.crate?.newest_version || null
      license     = info?.crate?.license || "unknown"
      description = (info?.crate?.description || "").slice(0, 100)

    } else if (pkg.ecosystem === "gem") {
      const info  = await fetchGemInfo(pkg.name)
      latest      = info?.version || null
      license     = (info?.licenses || []).join(", ") || "unknown"
      description = (info?.info || "").slice(0, 100)

    } else if (pkg.ecosystem === "go") {
      // Go modules — no easy public API, just mark as unknown
      return {
        ...pkg, latest: "see pkg.go.dev",
        isOutdated: false, deprecated: null, license: "unknown",
        description: "", riskScore: 0, risk: "low", reasons: [],
      }
    } else if (pkg.ecosystem === "composer") {
      // Composer — packagist API
      try {
        const safeName = pkg.name.replace("/", "%2F")
        const r = await fetch(`https://repo.packagist.org/p2/${safeName}.json`)
        if (r.ok) {
          const data = await r.json()
          latest = data?.packages?.[pkg.name]?.[0]?.version?.replace(/^v/, "") || null
        }
      } catch {}
    }

    const { score, risk, reasons } = calcRisk(pkg.installed, latest, deprecated)

    return {
      ...pkg,
      latest:     latest || "unknown",
      isOutdated: latest ? cleanVer(pkg.installed) !== cleanVer(latest) : false,
      deprecated, license, description,
      riskScore: score, risk, reasons,
    }
  } catch {
    return {
      ...pkg, latest: "unknown", isOutdated: false,
      deprecated: null, license: "unknown", description: "",
      riskScore: 0, risk: "low", reasons: [],
    }
  }
}

// ═══════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "#111620", border: "1px solid #1e2535",
      borderRadius: 8, padding: "14px 20px", flex: 1,
      borderTop: `2px solid ${color}`, minWidth: 0
    }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#4a5570", fontFamily: "monospace", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1, fontFamily: "monospace" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: "#4a5570", fontFamily: "monospace", marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Badge({ label, color }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      fontSize: 10, fontFamily: "monospace", fontWeight: 700,
      background: `${color}18`, border: `1px solid ${color}33`, color
    }}>
      {label}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════
// RISK TABLE
// ═══════════════════════════════════════════════════════════
function RiskTable({ packages, loading, progress, error, onRetry }) {
  const [search,     setSearch]     = React.useState("")
  const [riskF,      setRiskF]      = React.useState("all")
  const [ecoF,       setEcoF]       = React.useState("all")
  const [typeF,      setTypeF]      = React.useState("all")
  const [expanded,   setExpanded]   = React.useState(null)

  const counts = React.useMemo(() => ({
    all:      packages.length,
    critical: packages.filter(p => p.risk === "critical").length,
    high:     packages.filter(p => p.risk === "high").length,
    medium:   packages.filter(p => p.risk === "medium").length,
    low:      packages.filter(p => p.risk === "low").length,
  }), [packages])

  const ecosystems = [...new Set(packages.map(p => p.ecosystem))]

  const filtered = React.useMemo(() => packages.filter(p => {
    if (riskF !== "all" && p.risk !== riskF) return false
    if (ecoF  !== "all" && p.ecosystem !== ecoF) return false
    if (typeF === "dev"  && !p.isDev)  return false
    if (typeF === "prod" &&  p.isDev)  return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [packages, riskF, ecoF, typeF, search])

  const th = {
    padding: "9px 14px", textAlign: "left",
    fontFamily: "monospace", fontSize: 9,
    textTransform: "uppercase", letterSpacing: "0.1em",
    color: "#4a5570", borderBottom: "1px solid #1e2535",
    fontWeight: 400, background: "#0e1117",
  }

  // Loading
  if (loading) return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 28, marginBottom: 16 }}>⏳</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#00e5ff", marginBottom: 8 }}>
        Fetching registry data...
      </div>
      <div style={{ fontSize: 11, color: "#4a5570", fontFamily: "monospace", marginBottom: 16 }}>
        {progress.done} / {progress.total} packages analyzed
      </div>
      {/* Progress bar */}
      <div style={{ height: 4, background: "#1e2535", borderRadius: 2, overflow: "hidden", maxWidth: 300, margin: "0 auto" }}>
        <div style={{
          height: "100%", background: "#00e5ff", borderRadius: 2,
          width: progress.total > 0 ? `${Math.round((progress.done / progress.total) * 100)}%` : "0%",
          transition: "width 0.3s ease"
        }} />
      </div>
      {progress.current && (
        <div style={{ fontSize: 10, color: "#2e3d5a", fontFamily: "monospace", marginTop: 10 }}>
          checking: {progress.current}
        </div>
      )}
    </div>
  )

  // Error
  if (error) return (
    <div>
      <div style={{ padding: 16, borderRadius: 8, background: "#ff444410", border: "1px solid #ff444433", borderLeft: "3px solid #ff4444", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#ff4444", marginBottom: 6 }}>Analysis Failed</div>
        <div style={{ fontSize: 12, color: "#8a95b0", fontFamily: "monospace", lineHeight: 1.6 }}>{error}</div>
      </div>
      <div style={{ fontSize: 11, color: "#4a5570", fontFamily: "monospace", lineHeight: 1.8, marginBottom: 14 }}>
        Make sure your imported project contains one of:<br />
        <span style={{ color: "#ff4444" }}>package.json</span> ·{" "}
        <span style={{ color: "#3b82f6" }}>requirements.txt</span> ·{" "}
        <span style={{ color: "#ffb300" }}>Cargo.toml</span> ·{" "}
        <span style={{ color: "#00e676" }}>Gemfile</span> ·{" "}
        <span style={{ color: "#00e5ff" }}>go.mod</span> ·{" "}
        <span style={{ color: "#9c6fff" }}>composer.json</span>
      </div>
      <button onClick={onRetry} style={{ padding: "7px 18px", borderRadius: 6, border: "1px solid #00e5ff44", background: "#00e5ff12", color: "#00e5ff", cursor: "pointer", fontSize: 12, fontFamily: "monospace" }}>
        ↺ Retry
      </button>
    </div>
  )

  // No data
  if (packages.length === 0 && !loading) return (
    <div style={{ padding: 60, textAlign: "center", color: "#4a5570" }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>📦</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#6b7a99", marginBottom: 8 }}>No packages found</div>
      <div style={{ fontSize: 12, fontFamily: "monospace", lineHeight: 1.7 }}>
        Import a project that contains a manifest file:<br />
        <span style={{ color: "#ff4444" }}>package.json</span> ·{" "}
        <span style={{ color: "#3b82f6" }}>requirements.txt</span> ·{" "}
        <span style={{ color: "#ffb300" }}>Cargo.toml</span> ·{" "}
        <span style={{ color: "#00e676" }}>Gemfile</span> ·{" "}
        <span style={{ color: "#00e5ff" }}>go.mod</span> ·{" "}
        <span style={{ color: "#9c6fff" }}>composer.json</span>
      </div>
    </div>
  )

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4a5570", fontFamily: "monospace" }}>Risk</span>
        {["all","critical","high","medium","low"].map(r => {
          const color  = r === "all" ? "#e8edf5" : getRiskColor(r)
          const active = riskF === r
          return (
            <button key={r} onClick={() => setRiskF(r)} style={{
              padding: "3px 10px", borderRadius: 20, border: "1px solid",
              borderColor: active ? `${color}55` : "#1e2535",
              background: active ? `${color}14` : "transparent",
              color: active ? color : "#4a5570",
              fontSize: 10, fontFamily: "monospace", cursor: "pointer",
              transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5
            }}>
              {r}
              <span style={{ fontSize: 9, padding: "0 4px", borderRadius: 3, background: active ? `${color}20` : "#1e2535", color: active ? color : "#2e3d5a" }}>
                {counts[r] || 0}
              </span>
            </button>
          )
        })}

        <div style={{ width: 1, height: 16, background: "#1e2535" }} />

        <select value={ecoF} onChange={e => setEcoF(e.target.value)} style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #1e2535", background: "#111620", color: "#8a95b0", fontFamily: "monospace", fontSize: 10, outline: "none", cursor: "pointer" }}>
          <option value="all">All ecosystems</option>
          {ecosystems.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        {["all","prod","dev"].map(t => (
          <button key={t} onClick={() => setTypeF(t)} style={{
            padding: "3px 10px", borderRadius: 5, border: "1px solid",
            borderColor: typeF === t ? "#9c6fff55" : "#1e2535",
            background: typeF === t ? "#9c6fff14" : "transparent",
            color: typeF === t ? "#9c6fff" : "#4a5570",
            fontSize: 10, fontFamily: "monospace", cursor: "pointer", transition: "all 0.15s"
          }}>
            {t === "all" ? "all types" : t}
          </button>
        ))}

        <div style={{ marginLeft: "auto", position: "relative" }}>
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#4a5570", fontSize: 12, pointerEvents: "none" }}>🔍</span>
          <input
            placeholder="Search packages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "6px 10px 6px 28px", background: "#111620", border: "1px solid #1e2535", borderRadius: 6, color: "#e8edf5", fontFamily: "monospace", fontSize: 11, outline: "none", width: 190 }}
          />
        </div>
      </div>

      <div style={{ fontSize: 10, color: "#4a5570", fontFamily: "monospace", marginBottom: 10 }}>
        Showing {filtered.length} of {packages.length} packages
        {loading && <span style={{ color: "#00e5ff", marginLeft: 10 }}>· fetching registry data...</span>}
      </div>

      {/* Table */}
      <div style={{ background: "#111620", border: "1px solid #1e2535", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: "24%" }}>Package</th>
              <th style={{ ...th, width: "9%"  }}>Ecosystem</th>
              <th style={{ ...th, width: "11%" }}>Installed</th>
              <th style={{ ...th, width: "11%" }}>Latest</th>
              <th style={{ ...th, width: "8%"  }}>Type</th>
              <th style={{ ...th, width: "9%"  }}>Risk</th>
              <th style={th}>Issues</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#4a5570", fontFamily: "monospace", fontSize: 12 }}>
                  No packages match your filters
                </td>
              </tr>
            ) : filtered.map(pkg => {
              const rColor = getRiskColor(pkg.risk)
              const eColor = getEcoColor(pkg.ecosystem)
              const isExp  = expanded === `${pkg.ecosystem}:${pkg.name}`
              const isOutd = pkg.isOutdated

              return (
                <React.Fragment key={`${pkg.ecosystem}:${pkg.name}`}>
                  <tr
                    onClick={() => setExpanded(isExp ? null : `${pkg.ecosystem}:${pkg.name}`)}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#171e2c"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Package */}
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #1e2535" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {pkg.deprecated && (
                          <span style={{ fontSize: 9, color: "#ff4444", background: "#ff444418", border: "1px solid #ff444433", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>DEPRECATED</span>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#e8edf5", fontFamily: "monospace" }}>{pkg.name}</span>
                      </div>
                      {pkg.description && (
                        <div style={{ fontSize: 10, color: "#4a5570", fontFamily: "monospace", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                          {pkg.description}
                        </div>
                      )}
                    </td>
                    {/* Ecosystem */}
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #1e2535" }}>
                      <Badge label={pkg.ecosystem} color={eColor} />
                    </td>
                    {/* Installed */}
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #1e2535" }}>
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: isOutd ? "#ffb300" : "#8a95b0" }}>
                        {pkg.installed || "—"}
                      </span>
                    </td>
                    {/* Latest */}
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #1e2535" }}>
                      {pkg.latest === "unknown" ? (
                        <span style={{ fontSize: 10, color: "#2e3d5a", fontFamily: "monospace" }}>fetching...</span>
                      ) : (
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: isOutd ? "#00e676" : "#4a5570" }}>
                          {pkg.latest}
                        </span>
                      )}
                    </td>
                    {/* Type */}
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #1e2535" }}>
                      <Badge label={pkg.isDev ? "dev" : "prod"} color={pkg.isDev ? "#9c6fff" : "#00e5ff"} />
                    </td>
                    {/* Risk */}
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #1e2535" }}>
                      <Badge label={pkg.risk.toUpperCase()} color={rColor} />
                    </td>
                    {/* Issues */}
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #1e2535" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: pkg.reasons.length > 0 ? rColor : "#00e676" }}>
                          {pkg.reasons.length > 0
                            ? pkg.reasons[0] + (pkg.reasons.length > 1 ? ` +${pkg.reasons.length - 1} more` : "")
                            : "✓ Up to date"
                          }
                        </span>
                        <span style={{ color: "#4a5570", fontSize: 10, transition: "transform 0.2s", transform: isExp ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>▶</span>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  {isExp && (
                    <tr>
                      <td colSpan={7} style={{ padding: "0 14px 14px", borderBottom: "1px solid #1e2535", background: "#0e1117" }}>
                        <div style={{ padding: "14px 16px", borderRadius: 8, background: "#0a0c0f", border: "1px solid #1e2535", display: "flex", gap: 28, flexWrap: "wrap", fontSize: 11, fontFamily: "monospace" }}>
                          <div>
                            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4a5570", marginBottom: 4 }}>License</div>
                            <div style={{ color: "#e8edf5" }}>{pkg.license}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4a5570", marginBottom: 4 }}>Risk Score</div>
                            <div style={{ color: rColor }}>{pkg.riskScore} / 100</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4a5570", marginBottom: 4 }}>Update</div>
                            <div style={{ color: isOutd ? "#ffb300" : "#00e676" }}>
                              {isOutd ? `${pkg.installed} → ${pkg.latest}` : "Up to date"}
                            </div>
                          </div>
                          {pkg.deprecated && (
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4a5570", marginBottom: 4 }}>Deprecation Notice</div>
                              <div style={{ color: "#ff4444", lineHeight: 1.5 }}>{pkg.deprecated}</div>
                            </div>
                          )}
                          {pkg.reasons.length > 0 && (
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4a5570", marginBottom: 4 }}>All Issues</div>
                              {pkg.reasons.map((r, i) => (
                                <div key={i} style={{ color: "#8a95b0", marginBottom: 3, lineHeight: 1.5 }}>• {r}</div>
                              ))}
                            </div>
                          )}
                          <div style={{ marginLeft: "auto" }}>
                            <a
                              href={
                                pkg.ecosystem === "npm"      ? `https://www.npmjs.com/package/${pkg.name}` :
                                pkg.ecosystem === "pip"      ? `https://pypi.org/project/${pkg.name}` :
                                pkg.ecosystem === "cargo"    ? `https://crates.io/crates/${pkg.name}` :
                                pkg.ecosystem === "gem"      ? `https://rubygems.org/gems/${pkg.name}` :
                                pkg.ecosystem === "composer" ? `https://packagist.org/packages/${pkg.name}` :
                                pkg.ecosystem === "go"       ? `https://pkg.go.dev/${pkg.name}` : "#"
                              }
                              target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #1e2535", color: "#4a5570", fontSize: 10, textDecoration: "none", fontFamily: "monospace", display: "inline-block" }}
                              onMouseEnter={e => { e.target.style.borderColor = "#00e5ff44"; e.target.style.color = "#00e5ff" }}
                              onMouseLeave={e => { e.target.style.borderColor = "#1e2535";   e.target.style.color = "#4a5570" }}
                            >
                              View on registry ↗
                            </a>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// IMPORT DEPS PANEL
// ═══════════════════════════════════════════════════════════
function ImportDepsPanel({ files }) {
  const [selected, setSelected] = React.useState(null)

  const sc = s => s > 15 ? "#ff4444" : s > 8 ? "#ffb300" : "#00e676"

  const fanOut = selected ? (selected.imports || []).map(l => ({ label: l })) : []
  const fanIn  = selected
    ? files.filter(f => f.path !== selected.path &&
        (f.imports || []).some(imp =>
          imp.includes(getFileName(selected.path).replace(/\.(jsx|tsx|js|ts)$/, ""))
        ))
    : []

  const insights = React.useMemo(() => {
    if (!selected) return []
    const score = selected._meta?.stressScore || 0
    const out   = []
    if (score > 15)       out.push({ icon: "🔴", text: "Critical stress",   desc: "Very high coupling — refactoring priority",           color: "#ff4444" })
    else if (score > 8)   out.push({ icon: "🟡", text: "Moderate stress",   desc: "Monitor as the project grows",                        color: "#ffb300" })
    if (fanIn.length >= 3) out.push({ icon: "🔥", text: "Core module",      desc: `${fanIn.length} files depend on this`,               color: "#00e5ff" })
    if (fanIn.length === 0 && !selected.path.includes("App.") && !selected.path.includes("main.") && !selected.path.includes("index."))
      out.push({ icon: "👻", text: "Possibly unused",  desc: "Zero incoming imports — may be dead code",             color: "#9c6fff" })
    if ((selected.imports?.length || 0) > 5)
      out.push({ icon: "⚠️", text: "High fan-out",     desc: `Imports ${selected.imports.length} modules`,           color: "#ffb300" })
    if (out.length === 0) out.push({ icon: "✅", text: "Healthy module",    desc: "No coupling issues detected",                         color: "#00e676" })
    return out
  }, [selected, fanIn])

  const panelStyle = { flex: 1, background: "#111620", border: "1px solid #1e2535", borderRadius: 8, overflow: "hidden" }
  const panelHdr   = (color, title, sub) => (
    <div style={{ padding: "10px 14px", borderBottom: "1px solid #1e2535", background: "#0e1117" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color }}>{title}</div>
      <div style={{ fontSize: 9, color: "#4a5570", fontFamily: "monospace", marginTop: 2 }}>{sub}</div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#4a5570", fontFamily: "monospace", marginBottom: 8 }}>Select File to Inspect</div>
        <select
          value={selected?.path || ""}
          onChange={e => setSelected(files.find(f => f.path === e.target.value) || null)}
          style={{ width: "100%", padding: "9px 12px", background: "#111620", border: "1px solid #1e2535", borderRadius: 6, color: "#e8edf5", fontFamily: "monospace", fontSize: 12, outline: "none", cursor: "pointer" }}
        >
          <option value="">— choose a file —</option>
          {files.map((f, i) => <option key={`${f.path}-${i}`} value={f.path}>{f.path}</option>)}
        </select>
      </div>

      {selected ? (
        <>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 20 }}>
            {/* Fan-In */}
            <div style={panelStyle}>
              {panelHdr("#00e676", "← Used By", "files that import this module")}
              <div style={{ padding: 8 }}>
                {fanIn.length === 0
                  ? <div style={{ padding: 10, fontSize: 11, color: "#4a5570", fontFamily: "monospace" }}>No files import this module</div>
                  : fanIn.map((f, i) => (
                    <div key={i} style={{ padding: "7px 10px", borderRadius: 5, marginBottom: 4, background: "#0a0c0f", border: "1px solid #1e2535", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "#e8edf5", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>← {getFileName(f.path)}</span>
                      <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, flexShrink: 0, background: `${sc(f._meta?.stressScore||0)}18`, color: sc(f._meta?.stressScore||0), fontFamily: "monospace" }}>{f._meta?.stressScore||0}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Center */}
            <div style={{ width: 160, flexShrink: 0, background: "#111620", border: `1px solid ${sc(selected._meta?.stressScore||0)}44`, borderRadius: 8, padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 20 }}>📄</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#e8edf5", fontFamily: "monospace", textAlign: "center", wordBreak: "break-all" }}>{getFileName(selected.path)}</div>
              <div style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3, background: `${sc(selected._meta?.stressScore||0)}18`, color: sc(selected._meta?.stressScore||0), fontFamily: "monospace", fontWeight: 700 }}>stress: {selected._meta?.stressScore||0}</div>
              <div style={{ fontSize: 9, color: "#4a5570", fontFamily: "monospace", textAlign: "center" }}>{selected.imports?.length||0} imports<br/>{selected._meta?.incoming||0} incoming</div>
            </div>

            {/* Fan-Out */}
            <div style={panelStyle}>
              {panelHdr("#00e5ff", "→ Imports", "modules this file depends on")}
              <div style={{ padding: 8 }}>
                {fanOut.length === 0
                  ? <div style={{ padding: 10, fontSize: 11, color: "#4a5570", fontFamily: "monospace" }}>No imports</div>
                  : fanOut.map((imp, i) => (
                    <div key={i} style={{ padding: "7px 10px", borderRadius: 5, marginBottom: 4, background: "#0a0c0f", border: "1px solid #1e2535", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 9, width: 20, flexShrink: 0, fontFamily: "monospace", color: isExtImp(imp.label) ? "#9c6fff" : "#00e5ff" }}>{isExtImp(imp.label) ? "pkg" : "rel"}</span>
                      <span style={{ fontSize: 10, color: "#e8edf5", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{imp.label}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          {/* Insights */}
          <div style={{ background: "#111620", border: "1px solid #1e2535", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #1e2535", background: "#0e1117" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e8edf5" }}>Insights</div>
              <div style={{ fontSize: 10, color: "#4a5570", fontFamily: "monospace", marginTop: 2 }}>auto-generated analysis for {getFileName(selected.path)}</div>
            </div>
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
              {insights.map((ins, i) => (
                <div key={i} style={{ padding: "10px 12px", borderRadius: 6, background: "#0a0c0f", border: `1px solid ${ins.color}22`, borderLeft: `3px solid ${ins.color}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{ins.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: ins.color, marginBottom: 2 }}>{ins.text}</div>
                    <div style={{ fontSize: 11, color: "#8a95b0", lineHeight: 1.5 }}>{ins.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ border: "1px dashed #1e2535", borderRadius: 8, padding: 40, textAlign: "center", color: "#4a5570", fontFamily: "monospace", fontSize: 12 }}>
          ↑ Select a file above to inspect its dependency relationships
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function DependencyLens() {
  const { files } = useProjectStore()

  const [activeTab,  setActiveTab]  = React.useState("npm")
  const [packages,   setPackages]   = React.useState([])
  const [loading,    setLoading]    = React.useState(false)
  const [progress,   setProgress]   = React.useState({ done: 0, total: 0, current: "" })
  const [error,      setError]      = React.useState(null)
  const [ecosystems, setEcosystems] = React.useState([])
  const [analyzed,   setAnalyzed]   = React.useState(false)
  const abortRef = React.useRef(false)

  const runAnalysis = React.useCallback(async () => {
    if (!files.length) return

    // Debug: log all scanned file names so we can see what was found
    console.log("[DependencyLens] Scanned files:", files.map(f => f.path))

    // Extract packages from scanned file contents
    const raw = extractPackagesFromFiles(files)
    console.log("[DependencyLens] Raw packages found:", raw.length, raw.map(p => p.name + "(" + p.ecosystem + ")").slice(0, 10))

    if (raw.length === 0) {
      // Show which files were scanned to help debug
      const scannedNames = files.map(f => {
        const parts = (f.path || "").replace(/\\/g, "/").split("/")
        return parts[parts.length - 1]
      })
      console.log("[DependencyLens] File basenames:", scannedNames)
      setError(
        "No package manifest files found in your project.\n" +
        "The scanner needs package.json, requirements.txt, Cargo.toml, Gemfile, go.mod, or composer.json to be present in your project."
      )
      return
    }

    setLoading(true)
    setError(null)
    setPackages([])
    setProgress({ done: 0, total: raw.length, current: "" })
    abortRef.current = false

    const enriched = []

    // Process in batches of 5 to avoid rate limiting
    const BATCH = 5
    for (let i = 0; i < raw.length; i += BATCH) {
      if (abortRef.current) break
      const batch = raw.slice(i, i + BATCH)

      const results = await Promise.all(
        batch.map(pkg => enrichPackage(pkg))
      )

      enriched.push(...results)

      // Update state progressively so user sees results appearing
      const sorted = [...enriched].sort((a, b) => b.riskScore - a.riskScore)
      setPackages(sorted)
      setProgress({
        done:    Math.min(i + BATCH, raw.length),
        total:   raw.length,
        current: batch[0]?.name || ""
      })
      setEcosystems([...new Set(sorted.map(p => p.ecosystem))])
    }

    setLoading(false)
    setAnalyzed(true)
  }, [files])

  // Auto-run when files load
  React.useEffect(() => {
    if (files.length > 0 && !analyzed && !loading) {
      runAnalysis()
    }
    return () => { abortRef.current = true }
  }, [files.length])

  // Derived stats
  const critical  = packages.filter(p => p.risk === "critical").length
  const high      = packages.filter(p => p.risk === "high").length
  const outdated  = packages.filter(p => p.isOutdated).length

  return (
    <div style={{ padding: 24, background: "#0a0c0f", minHeight: "100%", color: "#e8edf5" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 4 }}>Dependency Lens</h2>
          <div style={{ fontSize: 11, color: "#4a5570", fontFamily: "monospace" }}>
            // package risk analysis · npm · pip · cargo · gem · composer · go
          </div>
        </div>
        {files.length > 0 && (
          <button
            onClick={() => { setAnalyzed(false); runAnalysis() }}
            disabled={loading}
            style={{ padding: "7px 16px", borderRadius: 6, border: "1px solid #1e2535", background: "transparent", color: loading ? "#4a5570" : "#00e5ff", cursor: loading ? "not-allowed" : "pointer", fontSize: 12, fontFamily: "monospace" }}
          >
            {loading ? `Analyzing... ${progress.done}/${progress.total}` : "↺ Refresh"}
          </button>
        )}
      </div>

      {/* STATS */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Packages" value={packages.length || (loading ? "..." : "—")} color="#00e5ff" />
        <StatCard label="Ecosystems"     value={ecosystems.length || (loading ? "..." : "—")} sub={ecosystems.join(", ") || "none detected"} color="#9c6fff" />
        <StatCard label="Critical Risk"  value={critical || (loading ? "..." : "—")} sub="deprecated or 2+ major behind" color="#ff4444" />
        <StatCard label="High Risk"      value={high     || (loading ? "..." : "—")} sub="1 major version behind"        color="#ff8800" />
        <StatCard label="Outdated"       value={outdated || (loading ? "..." : "—")} sub="any version mismatch"          color="#ffb300" />
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "1px solid #1e2535" }}>
        {[
          { id: "npm",     label: "📦 Package Risk Analysis" },
          { id: "imports", label: "🔗 Import Dependencies"   },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "8px 18px", background: "transparent", border: "none",
            borderBottom: `2px solid ${activeTab === t.id ? "#00e5ff" : "transparent"}`,
            color: activeTab === t.id ? "#00e5ff" : "#4a5570",
            fontSize: 12, fontFamily: "monospace", cursor: "pointer", transition: "all 0.15s"
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "npm" && (
        <RiskTable
          packages={packages}
          loading={loading && packages.length === 0}
          progress={progress}
          error={error}
          onRetry={() => { setAnalyzed(false); setError(null); runAnalysis() }}
        />
      )}

      {activeTab === "imports" && (
        <ImportDepsPanel files={files} />
      )}
    </div>
  )
}