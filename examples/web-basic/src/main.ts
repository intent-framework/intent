import { renderRouter } from "@intent-framework/dom"
import { router } from "./router.js"
import { NotFoundScreen } from "./screens.js"
import { updateTeamInfo, updateDiagnostics } from "./demo-panels.js"

const root = document.getElementById("root")!
renderRouter(router, {
  target: root,
  notFound: NotFoundScreen,
  showScreenName: true,
})

function onRouteChanged() {
  const match = router.match(location.pathname)
  if (match.found) {
    updateDiagnostics(match.screen)
    if (match.name === "team.details") {
      updateTeamInfo(match.params.teamId)
    } else {
      updateTeamInfo(undefined)
    }
  }
}

let framePending: number | undefined
new MutationObserver(() => {
  if (framePending) cancelAnimationFrame(framePending)
  framePending = requestAnimationFrame(() => {
    framePending = undefined
    onRouteChanged()
  })
}).observe(root, { childList: true })

onRouteChanged()
