import { screen, inspectScreen, type ScreenDefinition } from "@intent/core"
import { createRouter } from "@intent/router"
import { renderRouter } from "@intent/dom"
import type { RouterServices, RoutesFromPaths, RouteContext } from "@intent/router"

const appPaths = {
  home: "/",
  "team.details": "/teams/:teamId",
  "team.invite": "/teams/:teamId/invite",
} as const

type AppRoutes = RoutesFromPaths<typeof appPaths>
type AppServices = RouterServices<AppRoutes, {
  route: RouteContext<AppRoutes>
}>

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

let teamLoadVersion = 0
const teamVersions: Record<string, number> = {}

const teams: Record<string, { id: string; name: string; members: string[] }> = {
  team_1: { id: "team_1", name: "Alpha", members: [] },
  team_2: { id: "team_2", name: "Beta", members: [] },
  team_3: { id: "team_3", name: "Gamma", members: [] },
}

async function loadTeam(teamId: string) {
  await delay(80)
  const team = teams[teamId]
  if (!team) throw new Error(`Team "${teamId}" not found`)
  const version = ++teamLoadVersion
  teamVersions[teamId] = version
  return { ...team, version }
}

async function inviteMember(teamId: string, email: string) {
  await delay(200)
  const team = teams[teamId]
  if (!team) throw new Error(`Team "${teamId}" not found`)
  team.members.push(email)
}

function updateTeamInfo(teamId: string | undefined) {
  const el = document.getElementById("team-info")
  if (!el) return
  if (!teamId) {
    el.textContent = ""
    return
  }
  const team = teams[teamId]
  const version = teamVersions[teamId]
  if (team) {
    const versionStr = version ? `(v${version}) ` : ""
    el.textContent = `${versionStr}${team.name} — ${team.members.length} member${team.members.length === 1 ? "" : "s"}`
  }
}

function updateDiagnostics(screenDef: ScreenDefinition<AppServices>) {
  const el = document.getElementById("diagnostics")
  if (!el) return
  const inspected = inspectScreen(screenDef)
  if (inspected.diagnostics.length === 0) {
    el.textContent = "✓ No diagnostics."
  } else {
    el.textContent = inspected.diagnostics.map(d =>
      `[${d.severity}] ${d.code}${d.nodeId ? ` (${d.nodeId})` : ""}: ${d.message}`
    ).join("\n")
  }
}

const HomeScreen = screen<AppServices>("Home", $ => {
  const openAlpha = $.act("Open Alpha — team_1")
    .primary()
    .does(({ navigate }) => {
      navigate("team.details", { teamId: "team_1" })
    })

  const openBeta = $.act("Open Beta — team_2")
    .does(({ navigate }) => {
      navigate("team.details", { teamId: "team_2" })
    })

  const openGamma = $.act("Open Gamma — team_3")
    .does(({ navigate }) => {
      navigate("team.details", { teamId: "team_3" })
    })

  $.surface("main").contains(openAlpha, openBeta, openGamma)
})

const TeamDetailScreen = screen<AppServices>("Team Details", $ => {
  const team = $.resource("team", {
    load: async ({ route }) => {
      if (route.name === "team.details") {
        return loadTeam(route.params.teamId)
      }
      throw new Error("Expected team.details route")
    },
  })

  const refresh = $.act("Refresh team")
    .does(async ({ route }) => {
      await team.reload()
      if (route.name === "team.details") {
        updateTeamInfo(route.params.teamId)
      }
    })
    .feedback({
      pending: "Refreshing...",
      success: "Team refreshed.",
      failure: "Could not refresh.",
    })

  const invite = $.act("Invite member")
    .primary()
    .when(team.ready, "Team must load first.")
    .does(({ navigate, route }) => {
      if (route.name === "team.details") {
        navigate("team.invite", { teamId: route.params.teamId })
      }
    })

  const back = $.act("Back home")
    .does(({ navigate }) => {
      navigate("home")
    })

  $.surface("main").contains(refresh, invite, back)
})

const InviteScreen = screen<AppServices>("Invite", $ => {
  const emailText = $.state.text("email")
  const emailAsk = $.ask("Email", emailText)
    .asContact("email")
    .required()
    .private()

  const sendInvite = $.act("Send invite")
    .primary()
    .when(emailAsk.valid, "Enter a valid email address.")
    .does(async ({ navigate, route }) => {
      if (route.name === "team.invite") {
        await inviteMember(route.params.teamId, emailText.value)
        updateTeamInfo(route.params.teamId)
        navigate("team.details", { teamId: route.params.teamId })
      }
    })
    .feedback({
      pending: "Sending invite...",
      success: "Invite sent.",
      failure: "Could not send invite.",
    })

  $.flow("invite")
    .startsWith(emailAsk)
    .then(sendInvite)

  $.surface("main").contains(emailAsk, sendInvite)
})

const NotFoundScreen = screen<AppServices>("Not Found", $ => {
  $.surface("main").contains()
})

const router = createRouter<AppServices>()
  .route("home", appPaths.home, HomeScreen)
  .route("team.details", appPaths["team.details"], TeamDetailScreen)
  .route("team.invite", appPaths["team.invite"], InviteScreen)

const root = document.getElementById("root")!
renderRouter(router, {
  target: root,
  notFound: NotFoundScreen,
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
