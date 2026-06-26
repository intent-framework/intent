import { describe, it, expect } from "vitest"
import { testScreen } from "@intent-framework/testing"
import { inspectScreen } from "@intent-framework/core"
import { LoginScreen } from "./LoginScreen.js"
import { VaultScreen } from "./VaultScreen.js"
import { RecoveryScreen } from "./RecoveryScreen.js"
import { vaultRouter, type VaultServices } from "./router.js"

function navServices(routeName: string): VaultServices {
  return {
    navigate: () => {},
    route: { name: routeName, path: `/${routeName}`, params: {} },
  } as unknown as VaultServices
}

describe("LoginScreen", () => {
  it("flow has steps in expected order", () => {
    const flow = LoginScreen.flows.find(f => f.name === "login")!
    expect(flow.steps).toHaveLength(3)
    expect(flow.steps[0]!.node).toMatchObject({ label: "Username or email" })
    expect(flow.steps[1]!.node).toMatchObject({ label: "Password" })
    expect(flow.steps[2]!.node).toMatchObject({ label: "Unlock vault" })
  })

  it("password ask is secret and private", () => {
    const ask = LoginScreen.asks.find(a => a.label === "Password")!
    expect(ask.kind).toBe("secret")
    expect(ask.isPrivate).toBe(true)
  })

  it("login action is blocked until username/email and password are valid", async () => {
    await testScreen(LoginScreen, async app => {
      app.act("Unlock vault").toBeBlocked()
    }, { services: navServices("login") })
  })

  it("login action enables after valid inputs", async () => {
    await testScreen(LoginScreen, async app => {
      await app.answer("Username or email", "user@example.com")
      await app.answer("Password", "password123")
      app.act("Unlock vault").toBeEnabled()
    }, { services: navServices("login") })
  })
})

describe("VaultScreen", () => {
  it("secret key ask is secret and private", () => {
    const ask = VaultScreen.asks.find(a => a.label === "Secret key")!
    expect(ask.kind).toBe("secret")
    expect(ask.isPrivate).toBe(true)
  })

  it("decrypt action is blocked until secret key is valid", async () => {
    await testScreen(VaultScreen, async app => {
      app.act("Decrypt vault").toBeBlocked()
    }, { services: navServices("vault") })
  })

  it("BooleanState toggles locked/unlocked state", async () => {
    await testScreen(VaultScreen, async app => {
      // Initially locked — lock is blocked, decrypt is blocked until keys entered
      app.act("Lock vault").toBeBlockedBy("Vault is already locked")

      await app.answer("Secret key", "my-secret-key")
      await app.answer("Confirm key", "my-secret-key")

      // Decrypt then verify unlocked
      await app.act("Decrypt vault").run()
      app.act("Decrypt vault").toBeBlockedBy("Vault is already unlocked")
      app.act("Lock vault").toBeEnabled()

      // Lock back
      await app.act("Lock vault").run()
      app.act("Lock vault").toBeBlockedBy("Vault is already locked")
    }, { services: navServices("vault") })
  })
})

describe("RecoveryScreen", () => {
  it("reset action is blocked until valid recovery email", async () => {
    await testScreen(RecoveryScreen, async app => {
      app.act("Reset vault").toBeBlocked()

      await app.answer("Recovery email", "not-an-email")
      app.act("Reset vault").toBeBlocked()

      await app.answer("Recovery email", "user@example.com")
      app.act("Reset vault").toBeEnabled()
    }, { services: navServices("recovery") })
  })
})

describe("Router", () => {
  it("has login, vault, and recovery routes", () => {
    const routes = vaultRouter.routes()
    expect(routes).toHaveLength(3)

    const names = routes.map(r => r.name)
    expect(names).toContain("login")
    expect(names).toContain("vault")
    expect(names).toContain("recovery")
  })

  it("navigation flow can move login → vault → recovery → login", async () => {
    const navigated: string[] = []
    const trackNav = (name: string) => navigated.push(name)

    // Login → Vault
    await testScreen(LoginScreen, async app => {
      await app.answer("Username or email", "user@example.com")
      await app.answer("Password", "password123")
      await app.act("Unlock vault").run()
    }, {
      services: { navigate: trackNav, route: { name: "login", path: "/login", params: {} } } as unknown as VaultServices,
    })
    expect(navigated).toContain("vault")
    navigated.length = 0

    // Vault → Recovery
    await testScreen(VaultScreen, async app => {
      await app.act("Forgot key?").run()
    }, {
      services: { navigate: trackNav, route: { name: "vault", path: "/vault", params: {} } } as unknown as VaultServices,
    })
    expect(navigated).toContain("recovery")
    navigated.length = 0

    // Recovery → Login
    await testScreen(RecoveryScreen, async app => {
      await app.act("Back to login").run()
    }, {
      services: { navigate: trackNav, route: { name: "recovery", path: "/recovery", params: {} } } as unknown as VaultServices,
    })
    expect(navigated).toContain("login")
  })
})

describe("Diagnostics", () => {
  it("inspectScreen reports no orphaned-flow or flow-step-not-surfaced for correct screens", () => {
    for (const screen of [LoginScreen, VaultScreen, RecoveryScreen]) {
      const graph = inspectScreen(screen)
      const flowIssues = graph.diagnostics.filter(
        d => d.code === "orphaned-flow" || d.code === "flow-step-not-surfaced",
      )
      expect(flowIssues).toHaveLength(0)
    }
  })

  it("inspectScreen reports flow stepCount for each screen", () => {
    const loginGraph = inspectScreen(LoginScreen)
    const vaultGraph = inspectScreen(VaultScreen)
    const recoveryGraph = inspectScreen(RecoveryScreen)

    expect(loginGraph.flows.find(f => f.name === "login")!.stepCount).toBe(3)
    expect(vaultGraph.flows.find(f => f.name === "vaultAccess")!.stepCount).toBe(3)
    expect(recoveryGraph.flows.find(f => f.name === "recovery")!.stepCount).toBe(2)
  })
})
