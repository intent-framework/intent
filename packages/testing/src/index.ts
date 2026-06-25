import type { ScreenDefinition } from "@intent/core"

export type ScreenHandle = {
  act(label: string): {
    toBeEnabled(): void
    toBeBlocked(): void
  }
  answer(label: string, value: string): Promise<void>
  feedback(): string | null
  state(): ScreenDefinition
}

export function testScreen(name: string | ScreenDefinition, fn: (screen: ScreenHandle) => Promise<void>): Promise<void> {
  const screenDef = typeof name === "string" ? { name, asks: [], acts: [], flows: [], surfaces: [] } : name

  const handle: ScreenHandle = {
    act(label: string) {
      const actNode = screenDef.acts.find(
        a => a.label.toLowerCase() === label.toLowerCase()
      )
      if (!actNode) {
        throw new Error(`Act "${label}" not found. Available acts: ${screenDef.acts.map(a => a.label).join(", ")}`)
      }

      return {
        toBeEnabled() {
          if (!actNode.enabled) {
            const reasons = actNode.conditions
              .filter(c => !c.check())
              .map(c => c.message || "condition not met")
            throw new Error(
              `Expected act "${label}" to be enabled but it was blocked.\n  Reasons: ${reasons.join(", ")}`
            )
          }
        },
        toBeBlocked() {
          if (actNode.enabled) {
            throw new Error(`Expected act "${label}" to be blocked but it was enabled.`)
          }
        },
      }
    },

    async answer(label: string, value: string) {
      const askNode = screenDef.asks.find(
        a => a.label.toLowerCase() === label.toLowerCase()
      )
      if (!askNode) {
        throw new Error(
          `Ask "${label}" not found. Available asks: ${screenDef.asks.map(a => a.label).join(", ")}`
        )
      }

      const stateObj = askNode.state as { value: string; set: (v: string) => void }
      if (typeof stateObj.set === "function") {
        stateObj.set(value)
      }
    },

    feedback() {
      const actWithFeedback = screenDef.acts.find(
        a => a.statusMessage !== null
      )
      return actWithFeedback?.statusMessage ?? null
    },

    state() {
      return screenDef
    },
  }

  return fn(handle)
}
