import { describe, it, expect } from "vitest"
import { testScreen } from "@intent-framework/testing"
import { InviteMember } from "./InviteMember.js"

describe("InviteMember", () => {
  it("invite is blocked before valid email", async () => {
    await testScreen(InviteMember, async app => {
      app.act("Invite member").toBeBlockedBy("Enter a valid email first")
    })
  })

  it("invite becomes enabled after valid email", async () => {
    await testScreen(InviteMember, async app => {
      await app.answer("Email", "ada@example.com")
      app.act("Invite member").toBeEnabled()
    })
  })

  it("invite execution produces feedback", async () => {
    await testScreen(InviteMember, async app => {
      await app.answer("Email", "ada@example.com")
      await app.act("Invite member").run()
      expect(app.feedback()).toBe("Invite sent!")
    })
  })
})
