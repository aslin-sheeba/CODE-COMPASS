const path = require("path")
const { scanProject } = require("../codecompass/server/scanner/scanProject")

process.on("message", async (msg) => {
  if (!msg || msg.type !== "scan") return
  const folder = msg.folder

  try {
    const files = await scanProject(folder, (progress) => {
      if (process.send) process.send({ type: "progress", progress })
    })

    if (process.send) process.send({ type: "result", files })
  } catch (err) {
    if (process.send) process.send({ type: "error", error: String(err) })
    process.exit(1)
  }

  process.exit(0)
})
