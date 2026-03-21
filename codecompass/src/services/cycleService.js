export function findCycles(files) {
  const graph = {}
  files.forEach(f => {
    graph[f.path] = f.imports || []
  })

  const visited = new Set()
  const stack = []
  const cycles = []

  function dfs(node) {
    if (stack.includes(node)) {
      const cycleStart = stack.indexOf(node)
      const cycle = stack.slice(cycleStart).concat(node)
      cycles.push(cycle)
      return
    }

    if (visited.has(node)) return

    visited.add(node)
    stack.push(node)

    const neighbors = graph[node] || []
    neighbors.forEach(n => dfs(n))

    stack.pop()
  }

  Object.keys(graph).forEach(n => dfs(n))

  return cycles
}

