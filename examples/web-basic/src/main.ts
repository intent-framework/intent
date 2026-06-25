import { screen } from "@intent/core"
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

const teams: Record<string, { id: string; name: string; members: string[] }> = {
  team_1: { id: "team_1", name: "Alpha", members: [] },
  team_2: { id: "team_2", name: "Beta", members: [] },
  team_3: { id: "team_3", name: "Gamma", members: [] },
}

async function loadTeam(teamId: string) {
  await delay(80)
  const team = teams[teamId]
  if (!team) throw new Error(`Team "${teamId}" not found`)
  return team
}

async function inviteMember(teamId: string, email: string) {
  await delay(200)
  const team = teams[teamId]
  if (!team) throw new Error(`Team "${teamId}" not found`)
  team.members.push(email)
}

const HomeScreen = screen<AppServices>("Home", $ => {
  const openTeam = $.act("Open team")
    .primary()
    .when(true)
    .does(({ navigate }) => {
      navigate("team.details", { teamId: "team_1" })
    })

  $.surface("main").contains(openTeam)
})

const TeamDetailScreen = screen<AppServices>("Team Details", $ => {
  $.resource("team", {
    load: async ({ route }) => {
      if (route.name === "team.details") {
        return loadTeam(route.params.teamId)
      }
      throw new Error("Expected team.details route")
    },
  })

  const invite = $.act("Invite member")
    .primary()
    .when(true)
    .does(({ navigate, route }) => {
      if (route.name === "team.details") {
        navigate("team.invite", { teamId: route.params.teamId })
      }
    })

  $.surface("main").contains(invite)
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

const root = document.getElementById("root")
if (root) {
  renderRouter(router, {
    target: root,
    notFound: NotFoundScreen,
  })
}
