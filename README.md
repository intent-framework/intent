# Intent

Intent is a semantic full-stack interaction framework for TypeScript applications.

Instead of authoring component trees, markup, endpoint files, fetch calls, loading states, validation glue, and cache invalidation manually, Intent lets developers author the product interaction itself:

* what the screen is for
* what state exists
* what the system asks from the user
* what actions the user can perform
* when actions are allowed
* what feedback appears
* what resources are loaded
* what policies apply
* what flows guide the interaction
* what server operations exist
* how the interface should materialize across targets

Intent’s central idea:

```txt
Product intent is the program.
```

For the web:

```txt
The DOM is the output, not the language.
```

For backend:

```txt
API routes are transport, not the backend model.
```

For native:

```txt
Native components are output, not the source of truth.
```

## Why Intent Exists

React made HTML reactive.

Intent makes product behavior executable.

Most frontend frameworks still ask developers to write UI as a visual tree:

```tsx
<form>
  <input />
  <button>Save</button>
</form>
```

Intent starts from semantic interaction:

```ts
screen("Settings", $ => {
  const email = $.state.text("email")

  const emailAsk = $.ask("Email address", email)
    .asContact("email")
    .required()
    .private()

  const save = $.act("Save changes")
    .primary()
    .when(email.valid)
    .does(saveProfile)
    .feedback({
      pending: "Saving...",
      success: "Settings saved.",
      failure: "Could not save settings."
    })

  $.flow("settings")
    .startsWith(emailAsk)
    .then(save)

  $.surface("main")
    .purpose("manage-account-settings")
    .contains(emailAsk, save)
})
```

Intent does not ask the developer to write the DOM tree.

The framework materializes the semantic graph into real target output.

## Core Philosophy

Intent is built around these principles:

1. Core concepts are semantic, not visual.
2. Renderers materialize intent into target-specific UI.
3. The web renderer must output real semantic HTML.
4. React Native should be a first-class renderer target.
5. Server resources and actions should replace internal API route glue.
6. Type safety must be first-class from routes to actions to resources to tests.
7. The framework should generate and inspect behavior, not hide it.
8. Escape hatches must exist, but should not become the main authoring model.

## Core Primitives

Intent core should stay platformless.

Core primitives:

```txt
screen
state
ask
act
flow
surface
resource
policy
operation
event
job
subscription
```

Renderer-level concepts:

```txt
div
button
input
form
card
row
column
view
text
pressable
CSS
DOM
native components
HTTP routes
```

The core must not collapse into a prettier component library.

## Architecture

```txt
Developer code
  screen("Invite member", $ => {
    state
    ask
    act
    flow
    surface
    resource
    policy
  })

        ↓

Semantic application graph
  nodes
  dependencies
  rules
  metadata
  policies
  runtime contracts

        ↓

Reactive runtime
  fine-grained state
  derived semantic nodes
  resources
  action lifecycle
  validation
  feedback

        ↓

Materialization planner
  chooses target-specific patterns
  maps semantic nodes to output primitives

        ↓

Renderers and adapters
  DOM
  React Native
  SSR
  server
  OpenAPI
  SSE
  WebSocket
  tests
  docs
  command palette

        ↓

Real output
  semantic HTML
  native UI
  HTTP endpoints
  generated clients
  streams
  jobs
  tests
  documentation
```

## Planned Packages

```txt
packages/
  core/
  dom/
  server/
  router/
  testing/
  devtools/
  openapi/
  realtime/
  react-native/
  compiler/
```

Initial MVP packages:

```txt
packages/core
packages/dom
packages/testing
packages/server
```

## MVP Goal

The MVP must prove this:

```txt
A developer can build real web interactions without authoring DOM, JSX, or component trees, while still getting real semantic HTML, validation, feedback, routing, server actions, and tests.
```

## MVP Scope

Must include:

```txt
screen
state.text
state.choice
state.boolean
ask
act
flow
surface
resource
basic policy
DOM renderer
basic server actions
basic validation
basic feedback
semantic graph inspector
semantic tests
```

Do not build initially:

```txt
full design system
full React Native renderer
full OpenAPI suite
full realtime suite
visual editor
AI assistant
complex compiler
massive component library
full database abstraction
```

## First Demo

The first demo should be a login screen:

```ts
const LoginScreen = screen("Login", $ => {
  const email = $.state.text("email")
  const password = $.state.text("password")

  const emailAsk = $.ask("Email", email)
    .asContact("email")
    .required()
    .private()

  const passwordAsk = $.ask("Password", password)
    .asSecret()
    .required()
    .private()

  const login = $.act("Log in")
    .primary()
    .when(email.valid)
    .when(password.valid)
    .does(async () => {
      await loginUser({
        email: email.value,
        password: password.value
      })
    })
    .feedback({
      pending: "Logging in...",
      success: "Logged in.",
      failure: "Could not log in."
    })

  $.flow("login")
    .startsWith(emailAsk)
    .then(passwordAsk)
    .then(login)

  $.surface("main")
    .contains(emailAsk, passwordAsk, login)
})
```

Expected DOM renderer output shape:

```html
<main>
  <form>
    <label>Email</label>
    <input type="email" autocomplete="email" required />

    <label>Password</label>
    <input type="password" required />

    <button type="submit" disabled>Log in</button>

    <output aria-live="polite"></output>
  </form>
</main>
```

Expected semantic test:

```ts
testScreen(LoginScreen, async screen => {
  expect(screen.act("Log in")).toBeBlocked()

  await screen.answer("Email", "mahyar@example.com")
  await screen.answer("Password", "secret")

  expect(screen.act("Log in")).toBeEnabled()
})
```

## Type Safety

Type safety is a foundational requirement.

Intent should type:

```txt
state values
ask bindings
action inputs
action outputs
resource keys
resource values
route params
search params
policies
events
jobs
subscriptions
tests
renderer nodes
```

React types props.

Intent should type product behavior.

## Documentation

Detailed design documents live in `docs/`.

Recommended docs:

```txt
docs/01-vision.md
docs/02-architecture-addendum.md
docs/03-framework-specification.md
docs/04-building-the-framework.md
```

## Development

This repository is expected to use:

```txt
pnpm
TypeScript
tsdown
Vitest
Changesets
Biome or ESLint/Prettier
```

Exact commands should be added once the repo is scaffolded.

Expected commands:

```sh
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

## Status

Intent is currently a concept-stage framework.

The first implementation goal is not breadth.

The first implementation goal is to prove the authoring model.

Build the dagger before the cathedral.
