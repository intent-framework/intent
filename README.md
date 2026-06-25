# Intent

Intent is a semantic full-stack interaction framework for TypeScript applications.

Product intent is the program.

## MVP Status

The first working proof is implemented.

What works:

- `screen` - define interaction screens
- `state.text`, `state.boolean`, `state.choice` - reactive state with getter/setter
- `ask` - semantic questions with required validation, custom validation, privacy, input types
- `act` - actions with reactive conditions, async handlers, feedback states
- `resource` - async resources with load/reload lifecycle and reactive conditions
- `flow` - interaction sequencing
- `surface` - presentation grouping
- `@intent/dom` - real semantic HTML renderer (form, label, input, button, output)
- `@intent/testing` - semantic test harness (answer asks, assert act state, load resources)
- `@intent/server` - typed action/resource/policy skeleton
- `examples/web-basic` - Login screen without JSX or manual DOM

## Quick Example

```ts
import { screen } from "@intent/core"
import { renderDom } from "@intent/dom"

const LoginScreen = screen("Login", $ => {
  const email = $.state.text("email")
  const password = $.state.text("password")

  $.ask("Email", email).asContact("email").required().private()
  $.ask("Password", password).asSecret().required().private()

  $.act("Log in")
    .primary()
    .when(emailAsk.valid)
    .when(passwordAsk.valid)
    .does(async () => { await loginUser({ email: email.value, password: password.value }) })
    .feedback({ pending: "Logging in...", success: "Logged in.", failure: "Could not log in." })

  $.surface("main").contains(emailAsk, passwordAsk, login)
})

renderDom(LoginScreen, { target: document.getElementById("root")! })
```

Outputs real semantic HTML:

```html
<main>
  <form>
    <label>Email</label><input type="email" autocomplete="email" required />
    <label>Password</label><input type="password" required />
    <button type="submit" disabled>Log in</button>
    <output aria-live="polite"></output>
  </form>
</main>
```

## Resources

Resources let screens declare async data dependencies semantically:

```ts
const team = $.resource("team", {
  load: async () => getTeam(teamId.value)
})

// Reactive conditions
const invite = $.act("Send invite")
  .when(team.ready, "Team must load first.")

// Lifecycle
await team.load()       // idle → pending → ready/failed
await team.reload()     // re-fetch
team.status             // "idle" | "pending" | "ready" | "failed"
team.value              // T | undefined
team.ready.current      // boolean
```

## Semantic Tests

```ts
import { testScreen } from "@intent/testing"

await testScreen(LoginScreen, async screen => {
  expect(screen.act("Log in")).toBeBlocked()
  await screen.answer("Email", "mahyar@example.com")
  await screen.answer("Password", "secret")
  expect(screen.act("Log in")).toBeEnabled()
})
```

## Packages

| Package | Description |
|---------|-------------|
| `@intent/core` | Semantic graph builder. Zero DOM/React/Node dependencies. |
| `@intent/dom` | DOM renderer. Real semantic HTML. No JSX, no React. |
| `@intent/testing` | Semantic test harness. Test intent, not DOM. |
| `@intent/server` | Typed server actions, resources, policies. |

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

## Examples

```sh
cd examples/web-basic
pnpm dev
```

## Architecture

Intent starts from the semantic graph, not the component tree.

```
Developer authors intent → Semantic graph → DOM/resource/test materialization
```
