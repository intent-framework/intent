import { describe, it, expect } from "vitest"
import { testScreen } from "@intent-framework/testing"
import { inspectScreen } from "@intent-framework/core"
import { RegistrationForm } from "./RegistrationForm.js"

describe("RegistrationForm", () => {
  it("text state can be answered through the testing harness", async () => {
    await testScreen(RegistrationForm, async app => {
      await app.answer("Name", "Ada Lovelace")
      await app.answer("Email", "ada@example.com")
      app.act("Register").toBeBlockedBy("Enter a valid password")
    })
  })

  it("choice state can be answered and read", async () => {
    await testScreen(RegistrationForm, async app => {
      await app.answer("Role", "admin")
      const roleAsk = app.state().asks.find(a => a.label === "Role")!
      const value = (roleAsk.state as { value: string }).value
      expect(value).toBe("admin")
    })
  })

  it("boolean state can be toggled", async () => {
    await testScreen(RegistrationForm, async app => {
      const termsNode = app.state().asks.find(a => a.label === "Accept terms")!
      const state = termsNode.state as unknown as { value: boolean; toggle: () => void }
      expect(state.value).toBe(false)
      state.toggle()
      expect(state.value).toBe(true)
    })
  })

  it("secret ask participates in validity", async () => {
    await testScreen(RegistrationForm, async app => {
      await app.answer("Password", "short")
      app.act("Register").toBeBlocked()
      const passAsk = app.state().asks.find(a => a.label === "Password")!
      expect(passAsk.error).toBe("Password must be at least 8 characters")
    })
  })

  it("submit is blocked before required inputs are valid", async () => {
    await testScreen(RegistrationForm, async app => {
      app.act("Register").toBeBlocked()
    })
  })

  it("submit becomes enabled after valid inputs and accepted terms", async () => {
    await testScreen(RegistrationForm, async app => {
      await app.answer("Name", "Ada Lovelace")
      await app.answer("Email", "ada@example.com")
      await app.answer("Password", "securepass123")
      await app.answer("Role", "admin")

      const termsNode = app.state().asks.find(a => a.label === "Accept terms")!
      const termsState = termsNode.state as unknown as { set: (v: boolean) => void; value: boolean }
      termsState.set(false)

      app.act("Register").toBeBlockedBy("Accept the terms to continue")

      termsState.set(true)

      app.act("Register").toBeEnabled()

      await app.act("Register").run()
      expect(app.feedback()).toBe("Registration complete!")
    })
  })

  it("inspectScreen reports multiple surfaces", () => {
    const graph = inspectScreen(RegistrationForm)
    expect(graph.surfaces).toHaveLength(2)
    expect(graph.surfaces[0]!.name).toBe("main")
    expect(graph.surfaces[1]!.name).toBe("sidebar")
  })

  it("inspectScreen reports no flow diagnostics for this correct example", () => {
    const graph = inspectScreen(RegistrationForm)
    const flowWarnings = graph.diagnostics.filter(
      d => d.code === "flow-step-not-surfaced" || d.code === "orphaned-flow",
    )
    expect(flowWarnings).toHaveLength(0)
  })
})
