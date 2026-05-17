// src/components/SessionToast.jsx
// Fades in and auto-dismisses after 4 s.
import React from "react"
import { T } from "../theme"

export default function SessionToast({ message, onDismiss }) {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    if (!message) return
    // small delay so CSS transition fires
    const t1 = setTimeout(() => setVisible(true), 50)
    const t2 = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 400) }, 4000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 18px",
      background: T.surface, border: `1px solid ${T.tealBorder}`,
      borderRadius: T.rMd, boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      fontSize: 12, fontFamily: "monospace", color: T.text,
      opacity: visible ? 1 : 0,
      transition: "opacity 0.35s ease",
      pointerEvents: "none",
    }}>
      <span style={{ color: T.teal, fontSize: 14 }}>💾</span>
      {message}
    </div>
  )
}
