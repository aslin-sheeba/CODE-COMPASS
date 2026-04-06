import React from "react"
import { T } from "../theme"

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 12, padding: 32, color: T.textSub, background: T.bg,
        }}>
          <div style={{
            fontSize: 28, width: 52, height: 52, borderRadius: 12,
            background: T.redLight, border: `1px solid ${T.redBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>⚠</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
            Something went wrong
          </div>
          <pre style={{
            fontSize: 10, color: T.textHint, maxWidth: 480,
            overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
            background: T.surfaceAlt, border: `1px solid ${T.border}`,
            borderRadius: 6, padding: "10px 14px",
          }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: "6px 18px", borderRadius: 6,
              border: `1px solid ${T.border}`, background: T.surface,
              color: T.text, fontSize: 12, cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}