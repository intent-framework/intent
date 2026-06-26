import { screen } from "@intent-framework/core"

export const InviteMember = screen("InviteMember", $ => {
  const email = $.state.text("email")

  const emailAsk = $.ask("Email", email)
    .required("Email is required")
    .validate(value => value.includes("@") ? true : "Enter a valid email")

  const invite = $.act("Invite member")
    .primary()
    .when(emailAsk.valid, "Enter a valid email first")
    .does(() => {
      console.log("invite", email.value)
    })
    .feedback({
      pending: "Sending invite...",
      success: "Invite sent!",
      failure: "Could not send invite.",
    })

  $.surface("main").contains(emailAsk, invite)
})
