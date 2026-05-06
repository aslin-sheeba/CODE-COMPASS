function getAPI() {
  if (!window.electronAPI) {
    throw new Error("electronAPI is not available. Ensure preload.js is correctly configured.")
  }
  return window.electronAPI
}

export async function importProject() {
  return await getAPI().selectProject()
}

export function onScanProgress(cb) {
  const api = window.electronAPI
  if (api?.onScanProgress) {
    api.onScanProgress(cb)
  }
}

export async function getBranches(repoUrl, token) {
  return await getAPI().getBranches(repoUrl, token)
}

export async function cloneRepo(repoUrl, branch, token) {
  return await getAPI().cloneRepo(repoUrl, branch, token)
}

export function onCloneProgress(cb) {
  const api = window.electronAPI
  if (api?.onCloneProgress) {
    api.onCloneProgress(cb)
  }
}

export async function writeFile(filePath, newContent) {
  return await getAPI().writeFile(filePath, newContent)
}

export async function getGitData(projectPath) {
  return await getAPI().getGitData(projectPath)
}

export async function getGitDiff(projectPath, commitHash) {
  return await getAPI().getGitDiff(projectPath, commitHash)
}

export async function getGitStatus(projectPath) {
  return await getAPI().getGitStatus(projectPath)
}

export async function commitAndPush(projectPath, message, push = false) {
  return await getAPI().commitAndPush(projectPath, message, push)
}

export async function openInVSCode(projectPath) {
  return await getAPI().openInVSCode(projectPath)
}

export function removeAllListeners(channel) {
  window.electronAPI?.removeAllListeners(channel)
}