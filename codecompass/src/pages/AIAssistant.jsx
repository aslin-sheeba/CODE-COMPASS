import React from "react"
import { useProjectStore } from "../state/projectStore"
import { T } from "../theme"

const modelId = "llama-3.1-8b-instant";

function now() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }

const BOT_INTRO = {
  id: 0, role: "assistant",
  text: "Hi! I'm CodeCompass AI. Import a project and ask me anything about your architecture, dependencies, or code quality.",
  ts: now()
}

const QUICK = [
  "What are the biggest architecture issues?",
  "Which files have the most coupling?",
  "Explain the overall project structure",
  "Where should a new developer start?",
]

function buildSystemPrompt(files) {
  const base = `You are CodeCompass AI, an expert developer onboarding assistant. Be concise, technical, and specific. Always reference actual file names.`
  if (!files || files.length === 0) return base + "\n\nNo project loaded yet."
  const top = [...files].sort((a,b)=>(b._meta?.stressScore||0)-(a._meta?.stressScore||0)).slice(0,20)
  const summaries = top.map(f=>`FILE: ${f.path}\n  imports: ${(f.imports||[]).slice(0,8).join(", ")||"none"}\n  stress: ${f._meta?.stressScore??0} | incoming: ${f._meta?.incoming??0} | lines: ${f.lines??"?"}`).join("\n\n")
  return `${base}\n\nTotal files: ${files.length}\n\n${summaries}`
}

async function callAI(messages, systemPrompt) {
  const API_KEY = import.meta.env.VITE_GROQ_API_KEY

  if (!API_KEY) throw new Error("No Groq API key found")

  const lastUserMsg =
    messages.filter(m => m.role === "user").pop()?.text || "Hello"

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: lastUserMsg
          }
        ],
        temperature: 0.5
      })
    })

    const data = await res.json()
    console.log("GROQ RESPONSE:", data)

    if (!res.ok) {
      throw new Error(data.error?.message || "Groq API error")
    }

    return data.choices?.[0]?.message?.content || "No response"

  } catch (err) {
    console.error(err)
    throw new Error("AI failed: " + err.message)
  }
}

export default function AIAssistant() {
  const { files } = useProjectStore()
  const [messages, setMessages] = React.useState([BOT_INTRO])
  const [loading,  setLoading]  = React.useState(false)
  const [error,    setError]    = React.useState(null)
  const [input,    setInput]    = React.useState("")
  const bottomRef = React.useRef(null)

  React.useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, loading])

  const prevLen = React.useRef(0)
  React.useEffect(() => {
    if (files.length > 0 && prevLen.current === 0) {
      setMessages(p => [...p, { id: Date.now(), role:"assistant", text:`✓ ${files.length} files indexed. Ask me anything about your codebase.`, ts: now() }])
    }
    prevLen.current = files.length
  }, [files.length])

  const handleSend = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput(""); setError(null)
    const newMsgs = [...messages, { id: Date.now(), role:"user", text: msg, ts: now() }]
    setMessages(newMsgs); setLoading(true)
    try {
      const reply = await callAI(newMsgs, buildSystemPrompt(files))
      setMessages(p => [...p, { id: Date.now()+1, role:"assistant", text: reply, ts: now() }])
    } catch(e) { setError(e.message) }
    finally    { setLoading(false) }
  }

  // Debounced ask helper (React-safe)
  const askTimeoutRef = React.useRef(null)
  let lastCall = 0

  function handleAsk(question) {
    const nowTs = Date.now()
    if (nowTs - lastCall < 2000) {
      alert("Wait 2 seconds")
      return
    }
    lastCall = nowTs

    if (askTimeoutRef.current) clearTimeout(askTimeoutRef.current)

    askTimeoutRef.current = setTimeout(() => {
      handleSend(question)
    }, 1000) // 1 second delay
  }

  React.useEffect(() => {
    return () => { if (askTimeoutRef.current) clearTimeout(askTimeoutRef.current) }
  }, [])

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background: T.bg }}>
      {/* Header */}
      <div style={{ padding:"12px 20px", borderBottom:`1px solid ${T.border}`, background: T.surface, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background: T.brandLight, border:`1px solid ${T.brandBorder}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🤖</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color: T.text }}>AI assistant</div>
                  <div style={{ fontSize:10, color: T.textHint, fontFamily:"monospace" }}>{modelId} · {files.length} files loaded</div>
          </div>
        </div>
        <button onClick={() => { setMessages([BOT_INTRO]); setError(null) }} style={{ padding:"4px 10px", borderRadius: T.r, border:`1px solid ${T.border}`, background:"none", color: T.textSub, cursor:"pointer", fontSize:11, fontFamily:"monospace" }}>
          clear
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflow:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
        {messages.map(msg => {
          const isBot = msg.role === "assistant"
          return (
            <div key={msg.id} style={{ display:"flex", gap:8, maxWidth:"82%", alignSelf: isBot?"flex-start":"flex-end", flexDirection: isBot?"row":"row-reverse" }}>
              <div style={{ width:28, height:28, borderRadius:7, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, fontFamily:"monospace", background: isBot ? T.brandLight : T.tealLight, border:`1px solid ${isBot ? T.brandBorder : T.tealBorder}`, color: isBot ? T.brand : T.teal }}>
                {isBot ? "AI" : "U"}
              </div>
              <div>
                <div style={{ padding:"9px 13px", borderRadius:9, fontSize:12, lineHeight:1.7, background: isBot ? T.surface : T.brandLight, border:`1px solid ${isBot ? T.border : T.brandBorder}`, color: isBot ? T.text : T.brand, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                  {msg.text}
                </div>
                <div style={{ fontSize:9, color: T.textHint, fontFamily:"monospace", marginTop:3, textAlign: isBot?"left":"right" }}>{msg.ts}</div>
              </div>
            </div>
          )
        })}
        {loading && (
          <div style={{ display:"flex", gap:8, alignSelf:"flex-start" }}>
            <div style={{ width:28, height:28, borderRadius:7, background: T.brandLight, border:`1px solid ${T.brandBorder}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color: T.brand }}>AI</div>
            <div style={{ padding:"12px 14px", borderRadius:9, background: T.surface, border:`1px solid ${T.border}`, display:"flex", gap:5, alignItems:"center" }}>
              {[0,1,2].map(i=><div key={i} style={{ width:5, height:5, borderRadius:"50%", background: T.brand, animation:`bounce 1.2s ease ${i*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        {error && (
          <div style={{ padding:"8px 12px", borderRadius: T.r, background: T.redLight, border:`1px solid ${T.redBorder}`, fontSize:11, color: T.red, display:"flex", justifyContent:"space-between" }}>
            <span>{error}</span>
            <button onClick={()=>setError(null)} style={{ background:"none", border:"none", color: T.red, cursor:"pointer", fontSize:12 }}>✕</button>
          </div>
        )}
        {messages.length <= 2 && !loading && (
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:4 }}>
            {QUICK.map(p=>(
              <button key={p} onClick={()=>handleSend(p)} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${T.border}`, background: T.surface, color: T.textSub, cursor:"pointer", fontSize:11, fontFamily:"monospace", transition:"all 0.12s" }}
                onMouseEnter={e=>{e.target.style.borderColor=T.brand;e.target.style.color=T.brand}}
                onMouseLeave={e=>{e.target.style.borderColor=T.border;e.target.style.color=T.textSub}}
              >{p}</button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding:"10px 16px", borderTop:`1px solid ${T.border}`, background: T.surface, display:"flex", gap:8, alignItems:"flex-end", flexShrink:0 }}>
        <textarea rows={2} placeholder="ask about your codebase… (enter to send)" value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend()} }}
          style={{ flex:1, padding:"8px 12px", background: T.bg, border:`1px solid ${T.border}`, borderRadius: T.rMd, color: T.text, fontFamily:"monospace", fontSize:12, resize:"none", outline:"none", lineHeight:1.6, transition:"border 0.15s" }}
          onFocus={e=>e.target.style.borderColor=T.brand}
          onBlur={e=>e.target.style.borderColor=T.border}
        />
        <button onClick={()=>handleSend()} disabled={!input.trim()||loading}
          style={{ padding:"8px 16px", borderRadius: T.rMd, border:"none", background: input.trim()&&!loading ? T.brand : T.border, color: input.trim()&&!loading?"#fff": T.textHint, cursor: input.trim()&&!loading?"pointer":"not-allowed", fontSize:12, fontWeight:600, fontFamily:"monospace", flexShrink:0 }}>
          send →
        </button>
      </div>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }`}</style>
    </div>
  )
}