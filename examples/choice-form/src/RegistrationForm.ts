import { screen } from "@intent-framework/core"

export const RegistrationForm = screen("RegistrationForm", $ => {
  const name = $.state.text("name")
  const email = $.state.text("email")
  const password = $.state.text("password")
  const role = $.state.choice("role", {
    initial: "member",
    options: ["admin", "member", "viewer"] as const,
  })
  const acceptedTerms = $.state.boolean("acceptedTerms")

  const nameAsk = $.ask("Name", name)
    .required("Name is required")
    .hint("Enter your full name")

  const emailAsk = $.ask("Email", email)
    .asContact("email")
    .required("Email is required")
    .private()
    .validate(v => (v.includes("@") ? true : "Enter a valid email"))
    .hint("We'll use this for account recovery")

  const passwordAsk = $.ask("Password", password)
    .asSecret()
    .required("Password is required")
    .private()
    .validate(v => (v.length >= 8 ? true : "Password must be at least 8 characters"))

  const roleAsk = $.ask("Role", role)
    .asChoice()
    .required("Select a role")
    .hint("Choose admin, member, or viewer")

  const termsAsk = $.ask("Accept terms", acceptedTerms)

  const submit = $.act("Register")
    .primary()
    .when(nameAsk.valid, "Enter your name")
    .when(emailAsk.valid, "Enter a valid email")
    .when(passwordAsk.valid, "Enter a valid password")
    .when(roleAsk.valid, "Select a role")
    .when(() => acceptedTerms.value, "Accept the terms to continue")
    .does(() => {
      console.log("Registered:", {
        name: name.value,
        email: email.value,
        role: role.value,
      })
    })
    .feedback({
      pending: "Registering...",
      success: "Registration complete!",
      failure: "Registration failed.",
    })

  $.flow("registration")
    .startsWith(nameAsk)
    .then(emailAsk)
    .then(passwordAsk)
    .then(roleAsk)
    .then(termsAsk)
    .then(submit)

  $.surface("main").contains(nameAsk, emailAsk, passwordAsk, roleAsk, termsAsk, submit)
  $.surface("sidebar").contains(roleAsk, termsAsk)
})
