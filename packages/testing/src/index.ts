import type { ScreenDefinition } from "@intent/core"
import { createScreenRuntime } from "@intent/core"

export type ScreenHandle = {
  act(label: string): {
    toBeEnabled(): void
    toBeBlocked(): void
    toBeBlockedBy(...reasons: string[]): void
  }
  answer(label: string, value: string): Promise<void>
  feedback(): string | null
  state(): ScreenDefinition
  resource(name: string): {
    status(): string
    load(): Promise<void>
    reload(): Promise<void>
    invalidate(): void
    stale(): boolean
  }
  start(): Promise<void>
}

export async function testScreen(name: string | ScreenDefinition, fn: (screen: ScreenHandle) => Promise<void>): Promise<void> {
  const screenDef = typeof name === "string" ? { name, asks: [], acts: [], flows: [], surfaces: [], resources: [] } : name

  const runtime = createScreenRuntime(screenDef)

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
          if (!actNode.enabled.current) {
            const reasons = actNode.blockedReasons.length > 0
              ? actNode.blockedReasons
              : actNode.conditions.filter(c => !c.check()).map(_ => "condition not met")
            throw new Error(
              `Expected act "${label}" to be enabled but it was blocked.\n  Reasons: ${reasons.join(", ")}`
            )
          }
        },
        toBeBlocked() {
          if (actNode.enabled.current) {
            throw new Error(`Expected act "${label}" to be blocked but it was enabled.`)
          }
        },
        toBeBlockedBy(...reasons: string[]) {
          if (actNode.enabled.current) {
            throw new Error(
              `Expected act "${label}" to be blocked by "${reasons.join(", ")}" but it was enabled.`
            )
          }
          const actualReasons = actNode.blockedReasons
          for (const reason of reasons) {
            if (!actualReasons.includes(reason)) {
              throw new Error(
                `Expected act "${label}" to be blocked by "${reason}" but blocked reasons were: ${JSON.stringify(actualReasons)}`
              )
            }
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

    resource(name: string) {
      const resourceNode = screenDef.resources.find(
        r => r.name.toLowerCase() === name.toLowerCase()
      )
      if (!resourceNode) {
        throw new Error(
          `Resource "${name}" not found. Available resources: ${screenDef.resources.map(r => r.name).join(", ")}`
        )
      }

      return {
        status: () => resourceNode.status,
        load: () => resourceNode.load(),
        reload: () => resourceNode.reload(),
        invalidate: () => resourceNode.invalidate(),
        stale: () => resourceNode.stale.current,
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

    start() {
      return runtime.start()
    },
  }

  await runtime.start()

  try {
    await fn(handle)
  } finally {
    runtime.dispose()
  }
}
