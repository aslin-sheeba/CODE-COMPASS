import React from "react"
import ModuleGraph from "../components/ModuleGraph"
import { useProjectStore } from "../state/projectStore"

function Architecture({ activeCycle }) {
	const { files } = useProjectStore()

	const totalModules = files.length

	const highCoupling = files.filter(
		f => (f._meta && f._meta.stressScore) > 15
	).length

	const cleanModules = files.filter(
		f => (f._meta && f._meta.stressScore) <= 6
	).length

	// count dependencies
	const totalDependencies = files.reduce((sum, f) => {
		return sum + (f.imports ? f.imports.length : 0)
	}, 0)

	return (
		<div style={{ padding: 20 }}>
			<h2 style={{ marginBottom: 16 }}>Architecture — Module Map</h2>

			{/* Stats */}
			<div
				style={{
					display: "flex",
					gap: 24,
					marginBottom: 16,
					fontSize: 14,
					background: "#f8fafc",
					padding: 12,
					borderRadius: 6
				}}
			>
				<div><strong>Total Modules:</strong> {totalModules}</div>
				<div><strong>Dependencies:</strong> {totalDependencies}</div>
				<div><strong>High Coupling:</strong> {highCoupling}</div>
				<div><strong>Clean Modules:</strong> {cleanModules}</div>
			</div>

			{/* Legend */}
			<div style={{ marginBottom: 16 }}>
				<strong>Legend:</strong>

				<span style={{ marginLeft: 12 }}>
					<span
						style={{
							display: "inline-block",
							width: 12,
							height: 12,
							background: "#ccffcc",
							borderRadius: 4,
							marginRight: 6
						}}
					/>
					Low
				</span>

				<span style={{ marginLeft: 12 }}>
					<span
						style={{
							display: "inline-block",
							width: 12,
							height: 12,
							background: "#ffcc66",
							borderRadius: 4,
							marginRight: 6
						}}
					/>
					Medium
				</span>

				<span style={{ marginLeft: 12 }}>
					<span
						style={{
							display: "inline-block",
							width: 12,
							height: 12,
							background: "#ff6666",
							borderRadius: 4,
							marginRight: 6
						}}
					/>
					High
				</span>
			</div>

			
			<div style={{ display: "flex", gap: "15px", marginBottom: "10px" }}>
			<span>🟢 Low</span>
			<span>🟡 Medium</span>
			<span>🔴 High</span>
			</div>

			{/* Graph */}
			<div
				style={{
					border: "1px solid #eee",
					borderRadius: 8,
					overflow: "hidden"
				}}
			>
				<ModuleGraph width={1000} height={650} activeCycle={activeCycle} />
			</div>

			{/* Help text */}
			<div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
				Scroll to zoom • Drag canvas to pan • Click node to open file preview
			</div>
		</div>
	)
}

export default Architecture

