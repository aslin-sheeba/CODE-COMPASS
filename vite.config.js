import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  return {
    plugins: [react()],
    define: {
      // Correct env var name — matches what aiService reads (#15)
      "import.meta.env.VITE_ANTHROPIC_KEY": JSON.stringify(env.VITE_ANTHROPIC_KEY),
      "import.meta.env.VITE_GROQ_KEY":      JSON.stringify(env.VITE_GROQ_KEY),
    },
  }
})