const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export async function askAI(prompt) {
  console.log("GROQ API KEY:", API_KEY);

  if (!API_KEY) {
    return "❌ Groq API Key not found. Check .env file.";
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are CodeCompass AI, an expert developer onboarding assistant. Be concise and technical." },
          { role: "user", content: prompt }
        ],
        temperature: 0.5,
      }),
    });

    const data = await res.json();
    console.log("GROQ RESPONSE:", data);

    if (!res.ok) {
      return `❌ API Error: ${data.error?.message || "Unknown error"}`;
    }

    return data.choices?.[0]?.message?.content || "⚠️ No response from AI";
  } catch (err) {
    console.error("AI ERROR:", err);
    return "❌ Network error. Check internet/API.";
  }
}