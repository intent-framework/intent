import { inspectScreen, type ScreenDefinition } from "@intent/core"
import type { AppServices } from "./types.js"
import { teams, teamVersions } from "./data.js"

export function updateTeamInfo(teamId: string | undefined) {
  const el = document.getElementById("team-info")
  if (!el) return
  if (!teamId) {
    el.textContent = ""
    return
  }
  const team = teams[teamId]
  const version = teamVersions[teamId]
  if (team) {
    const versionStr = version ? `(v${version}) ` : ""
    el.textContent = `${versionStr}${team.name} — ${team.members.length} member${team.members.length === 1 ? "" : "s"}`
  }
}

export function updateDiagnostics(screenDef: ScreenDefinition<AppServices>) {
  const el = document.getElementById("diagnostics")
  if (!el) return
  const inspected = inspectScreen(screenDef)
  if (inspected.diagnostics.length === 0) {
    el.textContent = "✓ No diagnostics."
  } else {
    el.textContent = inspected.diagnostics.map(d =>
      `[${d.severity}] ${d.code}${d.nodeId ? ` (${d.nodeId})` : ""}: ${d.message}`
    ).join("\n")
  }
}
