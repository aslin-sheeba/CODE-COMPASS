import React from "react"
import { useProjectStore } from "../../state/projectStore"
import { T } from "../../theme"
import { getExtColor, getStressColor, basename, pillStyle } from "../../utils"
import Prism from "prismjs"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-tsx"
import "prismjs/components/prism-css"
import "prismjs/components/prism-markup"
import "prismjs/components/prism-json"

function getLang(path) {
  const ext = (path.match(/\.(\w+)$/) || [])[1] || ""
  return { js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx", css: "css", html: "markup", json: "json" }[ext] || "javascript"
}

// ── Pill ─────────────────────────────────────────────────────────────────────
function Pill({ children, color, bg, border }) {
  return <span style={pillStyle({ color, bg, border })}>{children}</span>
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: T.textHint, padding: 40 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: T.surfaceAlt, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📄</div>
      <span style={{ fontSize: 12 }}>select a file to preview</span>
    </div>
  )
}

// ── Code block ────────────────────────────────────────────────────────────────
// Prism token CSS is injected once into <head> to avoid per-render <style> tags (#8)
const PRISM_STYLE_ID = "prism-token-styles"
function injectPrismStyles() {
  if (document.getElementById(PRISM_STYLE_ID)) return
  const style = document.createElement("style")
  style.id = PRISM_STYLE_ID
  style.textContent = `
    .token.keyword                    { color: ${T.kwColor}; }
    .token.string, .token.attr-value  { color: ${T.strColor}; }
    .token.function                   { color: ${T.fnColor}; }
    .token.comment                    { color: ${T.cmColor}; font-style: italic; }
    .token.number                     { color: ${T.orange}; }
    .token.operator                   { color: ${T.textSub}; }
    .token.punctuation                { color: ${T.textSub}; }
    .token.class-name, .token.tag     { color: ${T.teal}; }
    .token.attr-name                  { color: ${T.orange}; }
    .token.boolean                    { color: ${T.kwColor}; }
  `
  document.head.appendChild(style)
}

function CodeBlock({ content, path, highlightLine }) {
  React.useEffect(() => { injectPrismStyles() }, [])

  const lang = getLang(path)
  const highlighted = React.useMemo(() => {
    try {
      const grammar = Prism.languages[lang] || Prism.languages.javascript
      return Prism.highlight(content || "", grammar, lang)
    } catch { return content || "" }
  }, [content, lang])

  const hlLines = highlighted.split("\n")

  return (
    <div style={{ flex: 1, overflow: "auto", background: T.codeBg, fontFamily: "monospace", fontSize: 11.5, lineHeight: 1.75 }}>
      {hlLines.map((lineHtml, i) => {
        const lineNum = i + 1
        const isHl    = highlightLine === lineNum
        return (
          <div key={i} style={{ display: "flex", background: isHl ? T.codeHl : "transparent", borderLeft: isHl ? `2px solid ${T.brand}` : "2px solid transparent" }}>
            <span style={{ width: 36, textAlign: "right", padding: "0 12px 0 0", color: isHl ? T.brand : T.codeNum, userSelect: "none", flexShrink: 0, fontSize: 10.5 }}>
              {lineNum}
            </span>
            <span dangerouslySetInnerHTML={{ __html: lineHtml || " " }} style={{ flex: 1, paddingRight: 20, color: T.codeText }} />
          </div>
        )
      })}
    </div>
  )
}

// ── Main CodePreview ──────────────────────────────────────────────────────────
export default function CodePreview({ unusedFiles }) {
  const { selectedFile } = useProjectStore()

  if (!selectedFile) return (
    <div style={{ flex: 1, display: "flex", background: T.codeBg }}><EmptyState /></div>
  )

  const meta    = selectedFile._meta || {}
  const fname   = basename(selectedFile.path)
  const stress  = meta.stressScore || 0
  const imports = (selectedFile.imports || []).length
  const lines   = selectedFile.lines || 0

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.codeBg, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, background: T.surface, display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <Pill color={T.textSub} bg={T.surfaceAlt} border={T.border}>{fname}</Pill>
        <Pill color={T.teal} bg={T.tealLight} border={T.tealBorder}>{lines} lines</Pill>
        {stress > 0 && (
          <Pill
            color={getStressColor(stress)}
            bg={stress > 15 ? T.redLight : stress > 8 ? T.orangeLight : T.greenLight}
            border={stress > 15 ? T.redBorder : stress > 8 ? T.orangeBorder : T.greenBorder}
          >
            risk: {Math.min(Math.round(stress / 4), 10)}
          </Pill>
        )}
        {imports > 0 && <Pill color={T.pink} bg={T.pinkLight} border={T.pinkBorder}>{imports} imports</Pill>}
        <span style={{ marginLeft: "auto", fontSize: 10.5, color: T.textHint, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>
          {selectedFile.path.replace(/\\/g, "/")}
        </span>
      </div>

      <CodeBlock content={selectedFile.content || "// file content not available"} path={selectedFile.path} />

      <div style={{ height: 30, borderTop: `1px solid ${T.border}`, background: T.surface, display: "flex", alignItems: "center", padding: "0 14px", gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: T.textHint, cursor: "pointer" }}>◀</span>
        <div style={{ flex: 1, height: 4, background: T.border, borderRadius: 2 }} />
        <span style={{ fontSize: 12, color: T.textHint, cursor: "pointer" }}>▶</span>
      </div>
    </div>
  )
}