import { screen } from "@intent-framework/core"
import type { AppServices } from "./types.js"

export let teamLoadCount = 0
export let auditLogLoadCount = 0
export let cachedTeamLoadCount = 0
export let dedupeReportLoadCount = 0
export let keyedTeamLoadCount = 0
export let timeEvictTeamLoadCount = 0
export let keyedTimeEvictLoadCount = 0

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

  const keyedTeam = $.resource("keyedTeam", {
    load: async ({ route }) => {
      keyedTeamLoadCount++
      return {
        id: route.params.id,
        name: `Team-${route.params.id}`,
        members: 3,
        version: keyedTeamLoadCount,
      } satisfies Team
    },
    cache: { key: ({ route }) => route.params.id },
  })

  const timeEvictTeam = $.resource("timeEvictTeam", {
    load: async ({ route }) => {
      timeEvictTeamLoadCount++
      return {
        id: route.params.id ?? "default",
        name: "TimeEvict",
        members: 7,
        version: timeEvictTeamLoadCount,
      } satisfies Team
    },
    cache: { cacheTime: 1000 },
  })

  const keyedTimeEvict = $.resource("keyedTimeEvict", {
    load: async ({ route }) => {
      keyedTimeEvictLoadCount++
      return {
        id: route.params.id,
        name: `Evict-${route.params.id}`,
        members: 2,
        version: keyedTimeEvictLoadCount,
      } satisfies Team
    },
    cache: { key: ({ route }) => route.params.id, cacheTime: 1000 },
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

  const loadKeyedTeamB = $.act("Load keyed team (team_b)")
    .does(async ({ navigate }) => {
      await keyedTeam.load({
        route: { name: "demo", path: "/:id", params: { id: "team_b" } },
        navigate,
      })
    })

  const reloadKeyedTeam = $.act("Reload keyed team")
    .does(async () => {
      await keyedTeam.reload()
    })

  const invalidateTimeEvict = $.act("Invalidate time-evict team")
    .does(() => {
      timeEvictTeam.invalidate()
    })

  const loadKeyedTimeEvictB = $.act("Load keyed time-evict (team_b)")
    .does(async ({ navigate }) => {
      await keyedTimeEvict.load({
        route: { name: "demo", path: "/:id", params: { id: "team_b" } },
        navigate,
      })
    })

  const invalidateKeyedTimeEvict = $.act("Invalidate keyed time-evict")
    .does(() => {
      keyedTimeEvict.invalidate()
    })

  $.surface("main").contains(
    reloadTeam,
    invalidateTeam,
    saveTeam,
    brokenSave,
    loadAuditLog,
    reloadCachedTeam,
    loadDedupeReport,
    loadKeyedTeamB,
    reloadKeyedTeam,
    invalidateTimeEvict,
    loadKeyedTimeEvictB,
    invalidateKeyedTimeEvict,
  )
})
