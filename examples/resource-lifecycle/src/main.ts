import { renderRouter } from "@intent-framework/dom"
import { inspectScreen } from "@intent-framework/core"
import { demoRouter } from "./router.js"
import { ResourceDemo } from "./ResourceDemo.js"

const root = document.getElementById("root")!
renderRouter(demoRouter, {
  target: root,
  showScreenName: true,
})

function updatePanels() {
  const statusEl = document.getElementById("resource-status")
  if (statusEl) {
    const info = ResourceDemo.resourceConfigs.flatMap(c => {
      const ref = c.ref
      if (!ref) return []
      return [{
        name: ref.name,
        status: ref.status,
        stale: ref.stale.current,
        error: ref.error instanceof Error ? ref.error.message : String(ref.error ?? ""),
      }]
    })
    statusEl.textContent = JSON.stringify(info, null, 2)
  }

  const inspectEl = document.getElementById("inspect")
  if (inspectEl) {
    inspectEl.textContent = JSON.stringify(inspectScreen(ResourceDemo), null, 2)
  }
}

setInterval(updatePanels, 200)
setTimeout(updatePanels, 100)
