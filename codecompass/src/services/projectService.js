export async function importProject() {
  const files = await window.electronAPI.selectProject()
  return files
}

export function onScanProgress(cb) {
  if (window.electronAPI && window.electronAPI.onScanProgress) {
    window.electronAPI.onScanProgress(cb)
  }
}