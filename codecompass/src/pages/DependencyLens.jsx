✅ 1. FIX IMPORT LINK MATCHING (CRITICAL)
🔍 Find this block:
node.imports.forEach(imp => {
  if (nodeMap[imp]) {
    l.push({ source: node.id, target: imp })
  }
})
🔥 Replace with:
node.imports.forEach(imp => {
  const cleanImp = (imp || "").replace(/\\/g, "/")

  const target = Object.keys(nodeMap).find(p =>
    (p || "").replace(/\\/g, "/").includes(cleanImp)
  )

  if (target) {
    l.push({ source: node.id, target })
  }
})

✅ This will:

fix missing edges
support Windows paths
NOT affect your arrow rendering
✅ 2. FIX LABEL PATH (SAFE)
🔍 Find:
n.file.path.split("/")
🔥 Replace ALL with:
(n.file.path || "").split(/[/\\]/)
✅ 3. MAKE NODES MORE VISIBLE (NO SIDE EFFECTS)
🔍 Find:
radius: 6 + Math.sqrt(imports.length) * 5
🔥 Replace with:
radius: 10 + (imports.length || 0) * 2
✅ 4. SAFE EDGE RENDER (KEEP ARROWS WORKING)

👉 DO NOT remove your arrow logic (markerEnd="url(#arrow)")

🔍 Find:
strokeOpacity={edgeVisible ? 1 : 0.15}
🔥 Replace with:
strokeOpacity={1}
✅ 5. SAFE NODE VISIBILITY (NO LOGIC BREAK)
🔍 Find:
opacity={visible ? 1 : 0.2}
🔥 Replace with:
opacity={1}
✅ 6. ADD DEBUG CLICK (IMPORTANT)
🔍 Inside node <circle>:
onClick={() => {
  setFocused(n)
  buildTree(n.id)
  selectFile(n.file)
}}
🔥 Replace with:
onClick={() => {
  console.log("NODE CLICKED:", n.file.path)
  setFocused(n)
  buildTree(n.id)
  selectFile(n.file)
}}
✅ 7. OPTIONAL (SAFE) — TEMP DISABLE CYCLE COLOR ONLY

👉 KEEP your cycle detection logic
👉 JUST simplify color (no break)

🔍 Find:
stroke={isCycleEdge ? '#ff6666' : '#555'}
🔥 Replace with:
stroke="#555"