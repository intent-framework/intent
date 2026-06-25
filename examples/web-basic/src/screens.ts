import { screen } from "@intent/core"
import type { AppServices } from "./types.js"
import { loadTeam, inviteMember } from "./data.js"
import { updateTeamInfo } from "./demo-panels.js"

export const HomeScreen = screen<AppServices>("Home", $ => {
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

export const TeamDetailScreen = screen<AppServices>("Team Details", $ => {
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

export const InviteScreen = screen<AppServices>("Invite", $ => {
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

export const NotFoundScreen = screen<AppServices>("Not Found", $ => {
  $.surface("main").contains()
})
