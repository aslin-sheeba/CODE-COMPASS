import React from "react"
import { useProjectStore } from "../state/projectStore"

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_KEY = "AIzaSyBPwKcSGR6YJW4jh0mA5Mi8_9Q7vl6BDmw"
const MODEL   = "gemini-flash-latest" // free tier model

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const BOT_INTRO = {
  id: 0,
  role: "assistant",
  text: "Hi! I'm your CodeCompass AI assistant powered by Gemini. Import a project and I'll help you understand the architecture, trace dependencies, spot issues, and answer any questions about your codebase.",
  ts: now()
}

const QUICK_PROMPTS = [
  "What are the biggest architecture issues?",
  "Which files have the most coupling?",
  "Explain the overall project structure",
  "What should a new developer look at first?",
]

function now() {
  return new Date().toLocaleTimeString(
    [], { hour: "2-digit", minute: "2-digit" }
  )
}

const scrollToBottom = (ref) => {
  if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
}

// ─── BUILD SYSTEM PROMPT ──────────────────────────────────────────────────────
function buildSystemPrompt(files) {
  const base = `You are CodeCompass AI, an expert developer onboarding assistant embedded inside a code analysis desktop tool.
Your job is to help developers understand codebases quickly — architecture patterns, data flows, coupling issues, refactoring priorities.
Be concise, technical, and specific. Always reference actual file names when relevant. Keep answers focused and actionable.`

  if (!files || files.length === 0) {
    return base + "\n\nNo project has been loaded yet. Encourage the user to import a project."
  }

  const topFiles = [...files]
    .sort((a, b) => (b._meta?.stressScore || 0) - (a._meta?.stressScore || 0))
    .slice(0, 20)

  const fileSummaries = topFiles.map(f => {
    const meta    = f._meta || {}
    const imports = (f.imports || []).slice(0, 10)
    return [
      `FILE: ${f.path}`,
      `  imports (${imports.length}): ${imports.join(", ") || "none"}`,
      `  stress: ${meta.stressScore ?? 0} | incoming: ${meta.incoming ?? 0} | lines: ${f.lines ?? "?"}`,
    ].join("\n")
  }).join("\n\n")

  const langMap = {}
  files.forEach(f => {
    const ext = (f.path.match(/\.(\w+)$/) || [])[1] || "other"
    langMap[ext] = (langMap[ext] || 0) + 1
  })
  const langSummary = Object.entries(langMap)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ")

  const highStress = files
    .filter(f => (f._meta?.stressScore || 0) > 10)
    .map(f => f.path)
    .slice(0, 5)

  const unused = files
    .filter(f =>
      (f._meta?.incoming || 0) === 0 &&
      !f.path.includes("main.") &&
      !f.path.includes("App.") &&
      !f.path.includes("index.")
    )
    .map(f => f.path)
    .slice(0, 5)

  return `${base}

━━━ PROJECT SNAPSHOT ━━━
Total files: ${files.length}
Languages: ${langSummary}
High stress files: ${highStress.join(", ") || "none"}
Possibly unused: ${unused.join(", ") || "none"}

━━━ FILE DETAILS (top ${topFiles.length} by stress) ━━━
${fileSummaries}`
}

// ─── CALL GEMINI API ──────────────────────────────────────────────────────────
async function discoverModel() {
  if (!API_KEY) return null
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    const res = await fetch(url)
    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      console.error('ListModels failed:', res.status, txt)
      return null
    }
    const data = await res.json()
    const models = data?.models || []
    console.log('Available models:', models.map(m => m.name))
    const pick = models.find(m => (m.supportedMethods || []).includes('generateContent'))
      || models.find(m => m.name && m.name.startsWith('gemini'))
    return pick?.name || null
  } catch (e) {
    console.error('discoverModel error', e)
    return null
  }
}

async function callAI(messages, systemPrompt) {
  if (!API_KEY) {
    throw new Error(
      "No API key found. Add VITE_GEMINI_KEY to your .env file and restart the dev server."
    )
  }

  // Build Gemini conversation history
  // Gemini uses "user" and "model" roles (not "assistant")
  const history = messages
    .filter(m => m.id !== 0) // skip intro message
    .slice(-12)               // last 12 messages
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }]
    }))

  // Gemini needs conversation to start with "user"
  // and alternate user/model — inject system prompt into first user message
  const contents = history.length > 0
    ? history
    : [{ role: "user", parts: [{ text: "Hello" }] }]

  // Try a short list of model name candidates (start with configured MODEL)
  const candidates = [MODEL]
  if (MODEL.includes("-latest")) candidates.push(MODEL.replace("-latest", ""))
  if (MODEL.includes("-flash-latest")) candidates.push(MODEL.replace("-flash-latest", "-flash"))

  const tried = new Set()
  let lastErr = null
  let lastErrText = null

  for (const modelName of candidates) {
    if (tried.has(modelName)) continue
    tried.add(modelName)

    const modelId = modelName.replace(/^models\//, "")
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${API_KEY}`

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
      })
    })

    if (!response.ok) {
      // Capture and log server response for debugging
      const text = await response.text().catch(() => "")
      console.error(`Gemini ${response.status} for model=${modelName}:`, text)
      lastErr = response.status
      lastErrText = text

      // If 404, try the next candidate; otherwise fail fast with the error message
      if (response.status === 404) {
        continue
      }
      throw new Error(`Gemini API error ${response.status}: ${text}`)
    }

    const data = await response.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response."
  }

  // Exhausted candidates
  const triedList = [...tried].join(", ")

  // If we exhausted our simple candidates, attempt discovery via ListModels
  const discovered = await discoverModel().catch(() => null)
  if (discovered && !tried.has(discovered)) {
    console.log('Discovered model to try:', discovered)
    const discoveredId = discovered.replace(/^models\//, "")
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${discoveredId}:generateContent?key=${API_KEY}`
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
      })
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.error(`Discovery attempt failed ${response.status} for model=${discovered}:`, text)
      throw new Error(`Gemini API error ${response.status}: ${text}`)
    }

    const data = await response.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response."
  }

  throw new Error(
    `Gemini API returned 404 for model candidates: ${triedList}. Last response: ${lastErrText || "no body"}`
  )
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function Avatar({ role }) {
  const isBot = role === "assistant"
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, fontWeight: 700, fontFamily: "monospace",
      background: isBot ? "#9c6fff18" : "#00e5ff18",
      border: `1px solid ${isBot ? "#9c6fff44" : "#00e5ff44"}`,
      color: isBot ? "#9c6fff" : "#00e5ff"
    }}>
      {isBot ? "AI" : "U"}
    </div>
  )
}

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isBot = msg.role === "assistant"
  return (
    <div style={{
      display: "flex", gap: 10, maxWidth: "80%",
      alignSelf: isBot ? "flex-start" : "flex-end",
      flexDirection: isBot ? "row" : "row-reverse",
      animation: "fadeUp 0.2s ease"
    }}>
      <Avatar role={msg.role} />
      <div>
        <div style={{
          padding: "10px 14px", borderRadius: 10,
          fontSize: 12, lineHeight: 1.7,
          background: isBot ? "#111620" : "#00e5ff18",
          border: `1px solid ${isBot ? "#1e2535" : "#00e5ff33"}`,
          color: isBot ? "#e8edf5" : "#00e5ff",
          whiteSpace: "pre-wrap", wordBreak: "break-word"
        }}>
          {msg.text}
        </div>
        <div style={{
          fontSize: 9, color: "#4a5570", fontFamily: "monospace",
          marginTop: 4,
          textAlign: isBot ? "left" : "right",
          paddingLeft: isBot ? 4 : 0,
          paddingRight: isBot ? 0 : 4
        }}>
          {msg.ts}
        </div>
      </div>
    </div>
  )
}

// ─── TYPING INDICATOR ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 10, alignSelf: "flex-start" }}>
      <Avatar role="assistant" />
      <div style={{
        padding: "12px 16px", borderRadius: 10,
        background: "#111620", border: "1px solid #1e2535",
        display: "flex", alignItems: "center", gap: 5
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#9c6fff",
            animation: `bounce 1.2s ease ${i * 0.2}s infinite`
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── ERROR BANNER ─────────────────────────────────────────────────────────────
function ErrorBanner({ message, onDismiss }) {
  return (
    <div style={{
      margin: "0 16px 8px", padding: "10px 14px", borderRadius: 8,
      background: "#ff444410", border: "1px solid #ff444433",
      borderLeft: "3px solid #ff4444",
      display: "flex", justifyContent: "space-between",
      alignItems: "flex-start", gap: 10
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700,
          color: "#ff4444", marginBottom: 3 }}>
          Error
        </div>
        <div style={{ fontSize: 11, color: "#8a95b0", lineHeight: 1.5 }}>
          {message}
        </div>
      </div>
      <button onClick={onDismiss} style={{
        background: "none", border: "none", color: "#4a5570",
        cursor: "pointer", fontSize: 14, flexShrink: 0, padding: 0
      }}>
        ✕
      </button>
    </div>
  )
}

// ─── QUICK PROMPTS ────────────────────────────────────────────────────────────
function QuickPrompts({ onSelect }) {
  return (
    <div style={{ padding: "10px 16px 0",
      display: "flex", gap: 8, flexWrap: "wrap" }}>
      {QUICK_PROMPTS.map(p => (
        <button key={p} onClick={() => onSelect(p)} style={{
          padding: "5px 12px", borderRadius: 20,
          border: "1px solid #1e2535", background: "transparent",
          color: "#8a95b0", cursor: "pointer", fontSize: 11,
          fontFamily: "monospace", transition: "all 0.15s"
        }}
          onMouseEnter={e => {
            e.target.style.borderColor = "#9c6fff"
            e.target.style.color = "#9c6fff"
          }}
          onMouseLeave={e => {
            e.target.style.borderColor = "#1e2535"
            e.target.style.color = "#8a95b0"
          }}
        >
          {p}
        </button>
      ))}
    </div>
  )
}

// ─── INPUT BAR ────────────────────────────────────────────────────────────────
function InputBar({ onSend, loading }) {
  const [input, setInput] = React.useState("")

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading) return
    onSend(text)
    setInput("")
  }

  return (
    <div style={{
      padding: "12px 16px", borderTop: "1px solid #1e2535",
      background: "#0e1117", display: "flex",
      gap: 10, alignItems: "flex-end"
    }}>
      <textarea
        rows={2}
        placeholder="Ask about your codebase... (Enter to send, Shift+Enter for newline)"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
          }
        }}
        style={{
          flex: 1, padding: "9px 13px",
          background: "#111620", border: "1px solid #1e2535",
          borderRadius: 8, color: "#e8edf5",
          fontFamily: "monospace", fontSize: 12,
          resize: "none", outline: "none",
          transition: "border 0.15s", lineHeight: 1.6
        }}
        onFocus={e => e.target.style.borderColor = "#9c6fff"}
        onBlur={e => e.target.style.borderColor = "#1e2535"}
      />
      <button
        onClick={handleSend}
        disabled={!input.trim() || loading}
        style={{
          padding: "9px 18px", borderRadius: 8, border: "none",
          background: input.trim() && !loading ? "#9c6fff" : "#1e2535",
          color: input.trim() && !loading ? "#fff" : "#4a5570",
          cursor: input.trim() && !loading ? "pointer" : "not-allowed",
          fontSize: 12, fontWeight: 700,
          transition: "all 0.15s", flexShrink: 0
        }}
      >
        Send →
      </button>
    </div>
  )
}

// ─── CONTEXT BADGE ────────────────────────────────────────────────────────────
function ContextBadge({ files }) {
  const hasFiles = files.length > 0
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      fontSize: 10, fontFamily: "monospace", padding: "4px 10px",
      borderRadius: 20,
      background: hasFiles ? "#00e5ff18" : "#1e253580",
      border: `1px solid ${hasFiles ? "#00e5ff33" : "#1e2535"}`,
      color: hasFiles ? "#00e5ff" : "#4a5570"
    }}>
      <div style={{
        width: 5, height: 5, borderRadius: "50%",
        background: hasFiles ? "#00e5ff" : "#4a5570",
        boxShadow: hasFiles ? "0 0 5px #00e5ff" : "none"
      }} />
      {hasFiles ? `${files.length} files loaded` : "no project loaded"}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const { files } = useProjectStore()
  const [messages, setMessages] = React.useState([BOT_INTRO])
  const [loading, setLoading]   = React.useState(false)
  const [error, setError]       = React.useState(null)
  const messagesRef = React.useRef(null)

  React.useEffect(() => {
    scrollToBottom(messagesRef)
  }, [messages, loading])

  // Notify when project loads
  const prevFileCount = React.useRef(0)
  React.useEffect(() => {
    if (files.length > 0 && prevFileCount.current === 0) {
      setMessages(p => [...p, {
        id: Date.now(),
        role: "assistant",
        text: `✅ Project loaded — ${files.length} files indexed.\n\nI now have full context of your codebase. Ask me anything about your architecture, dependencies, or code quality.`,
        ts: now()
      }])
    }
    prevFileCount.current = files.length
  }, [files.length])

  const handleSend = async (text) => {
    setError(null)
    const ts = now()
    const newMessages = [
      ...messages,
      { id: Date.now(), role: "user", text, ts }
    ]
    setMessages(newMessages)
    setLoading(true)

    try {
      const systemPrompt = buildSystemPrompt(files)
      const reply = await callAI(newMessages, systemPrompt)
      setMessages(p => [...p, {
        id: Date.now() + 1,
        role: "assistant",
        text: reply,
        ts: now()
      }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([BOT_INTRO])
    setError(null)
  }

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0) }
          40% { transform: translateY(-6px) }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column",
        height: "100%", background: "#0a0c0f"
      }}>

        {/* HEADER */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid #1e2535",
          background: "#0e1117", flexShrink: 0,
          display: "flex", alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "#9c6fff18", border: "1px solid #9c6fff44",
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 18
            }}>
              🤖
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700,
                color: "#e8edf5" }}>
                CodeCompass AI
              </div>
              <div style={{ fontSize: 10, color: "#4a5570",
                fontFamily: "monospace" }}>
                powered by Gemini
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ContextBadge files={files} />
            <button onClick={handleClear} style={{
              padding: "4px 10px", borderRadius: 6,
              border: "1px solid #1e2535", background: "transparent",
              color: "#4a5570", cursor: "pointer",
              fontSize: 10, fontFamily: "monospace"
            }}>
              Clear
            </button>
          </div>
        </div>

        {/* MESSAGES */}
        <div ref={messagesRef} style={{
          flex: 1, overflow: "auto", padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: 14
        }}>
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {loading && <TypingIndicator />}
        </div>

        {/* ERROR */}
        {error && (
          <ErrorBanner
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        {/* QUICK PROMPTS */}
        {messages.length <= 2 && !loading && (
          <QuickPrompts onSelect={handleSend} />
        )}

        {/* INPUT */}
        <InputBar onSend={handleSend} loading={loading} />

      </div>
    </>
  )
}