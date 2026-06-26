import { renderRouter } from "@intent-framework/dom"
import { inspectScreen } from "@intent-framework/core"
import { vaultRouter } from "./vault/router.js"

const root = document.getElementById("root")!
renderRouter(vaultRouter, {
  target: root,
  showScreenName: true,
})

function updateInspect() {
  const match = vaultRouter.match(location.pathname)
  if (match.found) {
    const inspectEl = document.getElementById("inspect")
    if (inspectEl) {
      inspectEl.textContent = JSON.stringify(inspectScreen(match.screen), null, 2)
    }
  }
}

let framePending: number | undefined
new MutationObserver(() => {
  if (framePending) cancelAnimationFrame(framePending)
  framePending = requestAnimationFrame(() => {
    framePending = undefined
    updateInspect()
  })
}).observe(root, { childList: true })

updateInspect()
