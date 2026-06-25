import { describe, it, expect, beforeEach } from "vitest"
import { server, resetServerRegistries, executeServerAction, loadServerResource } from "./index.js"

describe("server", () => {
  beforeEach(() => {
    resetServerRegistries()
  })

  it("registers and executes a server action", async () => {
    server.action("greet", {
      name: "greet",
      run: async ({ input }) => {
        return `Hello, ${(input as { name: string }).name}!`
      },
    })

    const result = await executeServerAction("greet", { name: "World" })
    expect(result).toBe("Hello, World!")
  })

  it("registers and loads a server resource", async () => {
    server.resource("users", {
      name: "users",
      load: async () => {
        return [{ id: 1, name: "Alice" }]
      },
    })

    const result = await loadServerResource("users", {})
    expect(result).toEqual([{ id: 1, name: "Alice" }])
  })

  it("registers and checks a policy", () => {
    server.policy("admin", {
      name: "admin",
      check: async ({ user }) => {
        return (user as { role: string }).role === "admin"
      },
    })

    const policies = [server.action("delete", {
      name: "delete",
      requires: "admin",
      run: async () => "deleted",
    })]

    expect(policies).toHaveLength(1)
  })

  it("throws for duplicate registration", () => {
    server.action("dup", {
      name: "dup",
      run: async () => "ok",
    })

    expect(() => {
      server.action("dup", {
        name: "dup",
        run: async () => "ok",
      })
    }).toThrow('Server action "dup" is already registered.')
  })
})
