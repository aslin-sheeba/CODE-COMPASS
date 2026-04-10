// src/services/aiService.js — Groq AI client (primary provider)
// Groq is the canonical AI provider for CodeCompass.
// Set VITE_GROQ_API_KEY in .env (see .env.example).

const GROQ_BASE  = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_MODEL = "llama-3.1-8b-instant"

const SYSTEM_PROMPT =
  "You are CodeCompass AI, an expert developer onboarding assistant. " +
  "Be concise, precise, and technical. Use markdown for code blocks. " +
  "When analysing code, focus on architecture, coupling, and risk."

function getApiKey() {
  return (
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GROQ_API_KEY) ||
    (typeof process    !== "undefined" && process.env?.VITE_GROQ_API_KEY)      ||
    null
  )
}

/**
 * Send a prompt to Groq and return the response text.
 * @param {string} prompt
 * @param {{ history?: Array<{role:string,content:string}> }} [opts]
 * @returns {Promise<string>}
 */
export async function askAI(prompt, opts = {}) {
  const apiKey = getApiKey()

  if (!apiKey) {
    return (
      "❌ Groq API key not found.\n\n" +
      "Add `VITE_GROQ_API_KEY=gsk_...` to your `.env` file.\n" +
      "See `.env.example` for the full template."
    )
  }

  const messages = [
    ...(opts.history || []),
    { role: "user", content: prompt },
  ]

  try {
    const res = await fetch(GROQ_BASE, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        messages:    [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.5,
        max_tokens:  1024,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      const msg = data.error?.message || `HTTP ${res.status}`
      console.error("[aiService] Groq error:", msg)
      return `❌ API error: ${msg}`
    }

    return data.choices?.[0]?.message?.content?.trim() || "⚠️ Empty response from AI."
  } catch (err) {
    console.error("[aiService] Network error:", err)
    return "❌ Network error — check your internet connection."
  }
}
