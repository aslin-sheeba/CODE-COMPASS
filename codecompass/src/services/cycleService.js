export function findCycles(files) {
  const graph = {}
  for (const f of files) graph[f.path] = f.imports || []

  const visited  = new Set()
  const stackSet = new Set()   // O(1) membership test — fixes #2
  const stackArr = []
  const cycles   = []

  function dfs(node) {
    if (stackSet.has(node)) {
      const start = stackArr.indexOf(node)
      cycles.push(stackArr.slice(start).concat(node))
      return
    }
    if (visited.has(node)) return

    visited.add(node)
    stackSet.add(node)
    stackArr.push(node)

    for (const n of (graph[node] || [])) dfs(n)

    stackArr.pop()
    stackSet.delete(node)
  }

  for (const n of Object.keys(graph)) dfs(n)
  return cycles
}