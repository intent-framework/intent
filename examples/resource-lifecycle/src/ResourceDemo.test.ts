import { describe, it, expect } from "vitest"
import { testScreen } from "@intent-framework/testing"
import { createScreenRuntime, inspectScreen } from "@intent-framework/core"
import { ResourceDemo, teamLoadCount, cachedTeamLoadCount, dedupeReportLoadCount, keyedTeamLoadCount } from "./ResourceDemo.js"

const testServices = {
  route: { name: "demo", path: "/:id", params: { id: "team_1" } },
  navigate: () => {},
} as const

describe("ResourceDemo", () => {
  it("autoLoad resource reaches ready", async () => {
    await testScreen(ResourceDemo, async app => {
      expect(app.resource("team").status()).toBe("ready")
    }, { services: testServices as any })
  })

  it("autoLoad: false resource starts idle", async () => {
    await testScreen(ResourceDemo, async app => {
      expect(app.resource("auditLog").status()).toBe("idle")
    }, { services: testServices as any })
  })

  it("manual load transitions resource to ready", async () => {
    await testScreen(ResourceDemo, async app => {
      expect(app.resource("auditLog").status()).toBe("idle")
      await app.resource("auditLog").load()
      expect(app.resource("auditLog").status()).toBe("ready")
    }, { services: testServices as any })
  })

  it("reload increments load count", async () => {
    await testScreen(ResourceDemo, async app => {
      const before = teamLoadCount
      await app.resource("team").reload()
      expect(teamLoadCount).toBe(before + 1)
    }, { services: testServices as any })
  })

  it("invalidate marks resource stale without reloading", async () => {
    await testScreen(ResourceDemo, async app => {
      const team = app.resource("team")
      expect(team.stale()).toBe(false)
      const before = teamLoadCount
      team.invalidate()
      expect(team.stale()).toBe(true)
      expect(teamLoadCount).toBe(before)
    }, { services: testServices as any })
  })

  it("reload clears stale", async () => {
    await testScreen(ResourceDemo, async app => {
      const team = app.resource("team")
      team.invalidate()
      expect(team.stale()).toBe(true)
      await team.reload()
      expect(team.stale()).toBe(false)
    }, { services: testServices as any })
  })

  it("action .invalidates() marks resource stale after success", async () => {
    await testScreen(ResourceDemo, async app => {
      const team = app.resource("team")
      expect(team.stale()).toBe(false)
      await app.act("Save team").run()
      expect(team.stale()).toBe(true)
    }, { services: testServices as any })
  })

  it("failed loader produces failed status and error", async () => {
    await testScreen(ResourceDemo, async app => {
      expect(app.resource("unstableReport").status()).toBe("failed")
    }, { services: testServices as any })
  })

  it("failed action does not invalidate resources", async () => {
    await testScreen(ResourceDemo, async app => {
      const team = app.resource("team")
      expect(team.stale()).toBe(false)
      await app.act("Broken save").run()
      expect(team.stale()).toBe(false)
    }, { services: testServices as any })
  })

  it("cache.staleTime marks resource stale after timeout", async () => {
    await testScreen(ResourceDemo, async app => {
      const cached = app.resource("cachedTeam")
      expect(cached.status()).toBe("ready")
      expect(cached.stale()).toBe(false)
      await new Promise(r => setTimeout(r, 100))
      expect(cached.stale()).toBe(true)
      expect(cached.status()).toBe("ready")
    }, { services: testServices as any })
  })

  it("reload resets staleTime timer and clears stale", async () => {
    await testScreen(ResourceDemo, async app => {
      const cached = app.resource("cachedTeam")
      await new Promise(r => setTimeout(r, 60))
      expect(cached.stale()).toBe(true)
      const before = cachedTeamLoadCount
      await cached.reload()
      expect(cachedTeamLoadCount).toBe(before + 1)
      expect(cached.stale()).toBe(false)
    }, { services: testServices as any })
  })

  it("cache.deduplicate shares in-flight promise", async () => {
    await testScreen(ResourceDemo, async app => {
      const report = app.resource("dedupeReport")
      expect(report.status()).toBe("idle")
      const before = dedupeReportLoadCount
      await Promise.all([report.load(), report.load()])
      expect(dedupeReportLoadCount).toBe(before + 1)
      expect(report.status()).toBe("ready")
    }, { services: testServices as any })
  })

  it("cache.key derives resource value from route context", async () => {
    const runtime = createScreenRuntime(ResourceDemo, { services: testServices as any })
    await runtime.start()
    const keyed = runtime.resources.find(r => r.name === "keyedTeam")!
    expect(keyed.status).toBe("ready")
    expect((keyed.value as any)?.id).toBe("team_1")
    expect((keyed.value as any)?.name).toBe("Team-team_1")
    runtime.dispose()
  })

  it("cache.key: different keys are independent", async () => {
    const runtime = createScreenRuntime(ResourceDemo, { services: testServices as any })
    await runtime.start()
    const keyed = runtime.resources.find(r => r.name === "keyedTeam")!
    const before = keyedTeamLoadCount
    // Load with a different key
    await keyed.load({ route: { name: "demo", path: "/:id", params: { id: "team_b" } } })
    expect(keyed.status).toBe("ready")
    expect((keyed.value as any)?.id).toBe("team_b")
    expect((keyed.value as any)?.name).toBe("Team-team_b")
    expect(keyedTeamLoadCount).toBe(before + 1)
    runtime.dispose()
  })

  it("cache.key: switching active key updates visible value/status", async () => {
    const runtime = createScreenRuntime(ResourceDemo, { services: testServices as any })
    await runtime.start()
    const keyed = runtime.resources.find(r => r.name === "keyedTeam")!
    // Initially keyed by route param "team_1"
    expect((keyed.value as any)?.id).toBe("team_1")
    // Switch to team_b
    await keyed.load({ route: { name: "demo", path: "/:id", params: { id: "team_b" } } })
    expect(keyed.status).toBe("ready")
    expect((keyed.value as any)?.id).toBe("team_b")
    // Switch back to team_1
    await keyed.load({ route: { name: "demo", path: "/:id", params: { id: "team_1" } } })
    expect(keyed.status).toBe("ready")
    expect((keyed.value as any)?.id).toBe("team_1")
    runtime.dispose()
  })

  it("cache.key: no-arg reload reuses last active key", async () => {
    const runtime = createScreenRuntime(ResourceDemo, { services: testServices as any })
    await runtime.start()
    const keyed = runtime.resources.find(r => r.name === "keyedTeam")!
    // Load team_b — changes active key
    await keyed.load({ route: { name: "demo", path: "/:id", params: { id: "team_b" } } })
    const afterFirst = keyedTeamLoadCount
    // no-arg reload uses lastContext → reloads team_b
    await keyed.reload()
    expect(keyedTeamLoadCount).toBe(afterFirst + 1)
    expect((keyed.value as any)?.id).toBe("team_b")
    runtime.dispose()
  })

  it("inspectScreen reports resources with status/stale/error", async () => {
    const runtime = createScreenRuntime(ResourceDemo, { services: testServices as any })
    await runtime.start()
    const graph = runtime.graph
    const resources = graph.resources
    expect(resources).toHaveLength(6)
    const teamRes = resources.find(r => r.name === "team")!
    expect(teamRes.status).toBe("ready")
    expect(teamRes.hasValue).toBe(true)
    expect(teamRes.stale).toBe(false)
    const auditRes = resources.find(r => r.name === "auditLog")!
    expect(auditRes.status).toBe("idle")
    expect(auditRes.hasValue).toBe(false)
    expect(auditRes.stale).toBe(false)
    const failedRes = resources.find(r => r.name === "unstableReport")!
    expect(failedRes.status).toBe("failed")
    expect(failedRes.hasValue).toBe(false)
    expect(failedRes.stale).toBe(false)
    expect(failedRes.error).toBe("Report generation failed")
    runtime.dispose()
  })

  it("no unrelated graph diagnostics are introduced", () => {
    const graph = inspectScreen(ResourceDemo)
    expect(graph.diagnostics).toHaveLength(0)
  })
})
