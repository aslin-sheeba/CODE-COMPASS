// src/services/sessionService.js
// Thin wrapper around electronAPI session calls.
// Falls back gracefully when running in browser (npm run dev without Electron).

const api = typeof window !== "undefined" ? window.electronAPI : null

/**
 * Save current session state.
 * @param {string} projectRoot
 * @param {string} branch
 * @param {object} data  — { tab, selectedFilePath, scrollTop, pinnedPaths, aiHistory }
 */
export async function saveSession(projectRoot, branch, data) {
  if (!api?.saveSession) return
  try { await api.saveSession(projectRoot, branch, data) } catch {}
}

/**
 * Load the most recent session for this project+branch.
 * Returns null if none exists.
 */
export async function loadSession(projectRoot, branch) {
  if (!api?.loadSession) return null
  try { return await api.loadSession(projectRoot, branch) } catch { return null }
}

/**
 * List the last 5 sessions (across all branches) for this project.
 */
export async function listSessions(projectRoot) {
  if (!api?.listSessions) return []
  try { return await api.listSessions(projectRoot) || [] } catch { return [] }
}

/**
 * Clear all sessions for this project.
 */
export async function clearSession(projectRoot) {
  if (!api?.clearSession) return
  try { await api.clearSession(projectRoot) } catch {}
}
