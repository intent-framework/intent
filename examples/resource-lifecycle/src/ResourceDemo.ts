import { screen } from "@intent-framework/core"
import type { AppServices } from "./types.js"

export let teamLoadCount = 0
export let auditLogLoadCount = 0
export let cachedTeamLoadCount = 0
export let dedupeReportLoadCount = 0

export type Team = {
  id: string
  name: string
  members: number
  version: number
}

export const ResourceDemo = screen<AppServices>("Resource Demo", $ => {
  const team = $.resource("team", {
    load: async ({ route }) => {
      teamLoadCount++
      return {
        id: route.params.id,
        name: "Core",
        members: 3,
        version: teamLoadCount,
      } satisfies Team
    },
  })

  const auditLog = $.resource("auditLog", {
    load: async () => {
      auditLogLoadCount++
      return ["entry_1", "entry_2"]
    },
    autoLoad: false,
  })

  $.resource("unstableReport", {
    load: async () => {
      throw new Error("Report generation failed")
    },
  })

  const cachedTeam = $.resource("cachedTeam", {
    load: async ({ route }) => {
      cachedTeamLoadCount++
      return {
        id: route.params.id,
        name: "Cached",
        members: 5,
        version: cachedTeamLoadCount,
      } satisfies Team
    },
    cache: { staleTime: 50 },
  })

  const dedupeReport = $.resource("dedupeReport", {
    load: async () => {
      dedupeReportLoadCount++
      await new Promise(r => setTimeout(r, 20))
      return { summary: "ok" }
    },
    autoLoad: false,
    cache: { deduplicate: true },
  })

  const reloadTeam = $.act("Reload team")
    .does(async () => {
      await team.reload()
    })

  const invalidateTeam = $.act("Invalidate team")
    .does(() => {
      team.invalidate()
    })

  const saveTeam = $.act("Save team")
    .does(async () => {})
    .invalidates(team)

  const brokenSave = $.act("Broken save")
    .does(async () => {
      throw new Error("Save failed")
    })
    .invalidates(team)

  const loadAuditLog = $.act("Load audit log")
    .does(async () => {
      await auditLog.load()
    })

  const reloadCachedTeam = $.act("Reload cached team")
    .does(async () => {
      await cachedTeam.reload()
    })

  const loadDedupeReport = $.act("Load dedupe report")
    .does(async () => {
      await dedupeReport.load()
    })

  $.surface("main").contains(
    reloadTeam,
    invalidateTeam,
    saveTeam,
    brokenSave,
    loadAuditLog,
    reloadCachedTeam,
    loadDedupeReport,
  )
})
