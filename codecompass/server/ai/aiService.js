// aiService.js — server-side AI proxy (optional: keeps API key server-side)
// Currently the app calls Groq directly from the client via VITE_GROQ_API_KEY.
// This service can be wired via IPC to proxy requests server-side if needed.

const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions"

async function callGroq(messages, systemPrompt, apiKey) {
  const res = await fetch(GROQ_BASE, {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role:"system", content: systemPrompt }, ...messages],
      temperature: 0.5,
      max_tokens: 1024,
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || "Groq error")
  return data.choices?.[0]?.message?.content || ""
}

module.exports = { callGroq }
