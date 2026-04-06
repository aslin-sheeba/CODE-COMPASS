// ── Path helpers ─────────────────────────────────────────────────────────────
export const normPath = (p = "") => p.replace(/\\/g, "/")
export const basename = (p = "") => normPath(p).split("/").pop()
export const extname  = (p = "") => (normPath(p).match(/\.(\w+)$/) || [])[1] || ""
export const dirname  = (p = "") => { const parts = normPath(p).split("/"); return parts.slice(0, -1).join("/") }

// ── Extension → color ─────────────────────────────────────────────────────────
import { T } from "./theme"
export const EXT_COLOR = {
  tsx: T.teal,  ts: T.blue, jsx: T.teal, js: T.orange,
  css: "#8b5cf6", json: T.green, md: T.orange, html: T.red,
}
export const getExtColor = (path) => EXT_COLOR[extname(path)] || T.textHint

// ── Stress → color ────────────────────────────────────────────────────────────
export const getStressColor = (s) => s > 15 ? T.red : s > 8 ? T.orange : T.teal
export const getStressDot   = (s) => s > 15 ? T.red : s > 8 ? T.orange : T.teal

// ── Pill style factory (reused across App + CodePreview) ──────────────────────
export const pillStyle = ({ color, bg, border }) => ({
  display: "inline-flex", alignItems: "center",
  padding: "3px 10px", borderRadius: 20,
  fontSize: 11, fontFamily: "monospace", fontWeight: 500,
  color, background: bg, border: `1px solid ${border}`,
})