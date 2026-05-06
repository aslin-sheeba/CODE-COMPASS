# 🧭 CodeCompass

A standalone developer onboarding tool built with Electron, React 18, D3-force, and Groq AI.

## Setup

```bash
npm install
cp .env.example .env
# Add your Groq API key to .env (free at https://console.groq.com)
```

## Run

```bash
npm start        # Electron + Vite dev mode
npm run dev      # Vite only (browser, no Electron APIs)
```

## Features

| Feature | Status |
|---------|--------|
| Dashboard + File Explorer | ✅ Complete |
| Architecture Graph (D3-force) | ✅ Complete |
| Code Search (in-memory) | ✅ Complete |
| Dependency Lens (npm/pip/cargo/gem/go/composer) | ✅ Complete |
| Git Activity (real git log via simple-git) | ✅ Complete |
| AI Assistant (Groq, full conversation history) | ✅ Complete |
| Onboarding Guide (auto-generated) | ✅ Complete |
