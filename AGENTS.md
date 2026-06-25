# AGENTS.md

## Project

This repository contains **Intent**, a semantic full-stack interaction framework for TypeScript applications.

Intent is not a React clone, JSX alternative, component library, UI kit, or API route framework.

Intent’s core idea:

```txt
Product intent is the program.
```

Intent lets developers author applications through semantic primitives such as:

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

Renderers and adapters materialize those semantic graphs into real output:

```txt
DOM
React Native
SSR
server actions
resources
OpenAPI
SSE
WebSocket
tests
documentation
DevTools
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

## Primary Source of Truth

The consolidated framework specification in `docs/` is the architectural source of truth.

Before doing meaningful work, read:

```txt
README.md
AGENTS.md
docs/*.md
```

If there is a single consolidated document, treat it as the main specification.

Do not contradict the consolidated spec unless the user explicitly asks to change the framework direction.

When implementation details are missing, infer conservatively from the spec and preserve the core principle:

```txt
The source code is intent.
```

## Agent Role

You are expected to actively maintain this repository.

Your responsibilities include:

```txt
implementing framework packages
maintaining project structure
keeping documentation current
creating and updating tests
running validation commands
keeping GitHub branches updated
opening or updating PRs when appropriate
writing clear commits
tracking follow-up work
protecting architectural boundaries
```

Do not only make code changes.

Maintain the repo as a real project.

## Non-Negotiable Principles

1. Core must stay semantic and platformless.
2. Core must not depend on React, React Native, DOM, Node-specific APIs, or a server framework.
3. Do not turn the framework into `Button`, `Input`, `Card`, `Row`, or `Column` as the main authoring model.
4. Visual primitives belong in renderers, materializers, kits, examples, or escape hatches.
5. The DOM renderer must output real semantic HTML.
6. React Native should be a renderer target, not a core assumption.
7. Server actions and resources are the backend model.
8. API routes are transport or escape hatches.
9. Type safety is first-class.
10. Escape hatches are allowed, but must remain explicit and isolated.
11. Prefer small, inspectable systems over magical abstractions.
12. Build the MVP before expanding the vision.
13. Never claim a feature works unless tests or examples prove it.

## Architecture Boundary

Core concepts:

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
semantic graph
reactive runtime
```

Renderer or adapter concepts:

```txt
div
button
input
form
section
view
text
pressable
CSS
HTML
React
React Native
HTTP route
WebSocket
SSE
OpenAPI
database adapter
native component
```

Do not leak renderer or adapter concepts into core.

## Expected Repository Structure

Use a pnpm workspace.

Expected structure:

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

examples/
  web-basic/
  web-ssr/
  native-basic/

docs/
```

Initial MVP work should focus on:

```txt
packages/core
packages/dom
packages/testing
packages/server
examples/web-basic
```

Do not build later packages until the MVP is proven.

## Package Naming

The framework is named **Intent**.

Use the `@intent/*` package namespace.

Expected package names:

```txt
@intent/core
@intent/dom
@intent/server
@intent/router
@intent/testing
@intent/devtools
@intent/openapi
@intent/realtime
@intent/react-native
@intent/compiler
```

## Dependency Rules

### Core Package

`@intent/core` must:

```txt
have zero runtime dependencies if possible
avoid DOM APIs
avoid Node APIs
avoid React
avoid React Native
avoid server framework dependencies
avoid styling dependencies
avoid mandatory schema-library dependencies
```

Core may define a small internal schema interface or support a standard schema-compatible shape.

### DOM Package

`@intent/dom` may depend on:

```txt
@intent/core
```

It must not depend on React.

It should use browser APIs directly.

It must output real semantic HTML.

### Server Package

`@intent/server` may depend on:

```txt
@intent/core
```

It should prefer Web API concepts:

```txt
Request
Response
Headers
URL
ReadableStream
```

It must not require Express, Fastify, Hono, Next, Remix, or any specific server framework in core logic.

Framework adapters can come later.

### React Native Package

`@intent/react-native` must be a renderer target.

React and React Native should be peer dependencies.

Do not put React Native assumptions into core.

## Type Safety Requirements

Type safety is foundational.

Intent should type:

```txt
state values
ask bindings
validation
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
semantic tests
renderer nodes
```

Examples:

```ts
const role = $.state.choice("role", {
  initial: "viewer",
  options: ["viewer", "editor", "admin"] as const
})

role.set("editor") // valid
role.set("owner") // must fail typechecking
```

Avoid `any`.

Use `unknown` at boundaries and narrow it.

Preserve literal inference where possible.

Prefer typed handles over loose strings when possible.

## Build Tools

Use:

```txt
pnpm
TypeScript
tsdown
Vitest
Changesets
Biome or ESLint/Prettier
```

Root scripts should include:

```json
{
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "tsc -p tsconfig.typecheck.json",
    "lint": "tsc -p tsconfig.typecheck.json"
  }
}

Root `pnpm typecheck` must use `tsconfig.typecheck.json` with `noEmit: true` and `paths` mapping workspace packages to source. It must not require `pnpm build` first and must not emit `dist/` files.
```

Each package should include package-level scripts where applicable.

## Implementation Order

Work in this order unless the user explicitly changes priorities:

1. Scaffold pnpm monorepo.
2. Create package build, test, typecheck, and lint setup.
3. Implement `@intent/core` semantic graph builder.
4. Implement internal reactive runtime.
5. Implement state primitives.
6. Implement ask builder and validation.
7. Implement act builder and action lifecycle.
8. Implement flow and surface nodes.
9. Implement graph inspection.
10. Implement `@intent/dom` basic renderer.
11. Implement `@intent/testing`.
12. Create `examples/web-basic`.
13. Implement minimal `@intent/server` action/resource/policy skeleton.
14. Add basic router only after core, DOM, testing, and server skeleton are stable.
15. Defer OpenAPI, realtime, React Native, compiler, and DevTools until MVP works.

## MVP Target

The first working proof should support this screen:

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

The DOM renderer should produce real semantic HTML containing:

```txt
main
form
label
input type="email"
input type="password"
button
output aria-live="polite"
```

The semantic testing package should allow:

```ts
testScreen(LoginScreen, async screen => {
  expect(screen.act("Log in")).toBeBlocked()

  await screen.answer("Email", "mahyar@example.com")
  await screen.answer("Password", "secret")

  expect(screen.act("Log in")).toBeEnabled()
})
```

## Testing Rules

Add tests for every meaningful behavior.

For `@intent/core`, test:

```txt
graph creation
state updates
choice state type inference
ask registration
required validation
custom validation
action enabled/blocked status
action lifecycle
flow registration
surface registration
graph inspection
```

For `@intent/dom`, test:

```txt
semantic HTML output
labels
input types
required fields
disabled actions
feedback output
accessibility attributes
state-driven updates
```

For `@intent/testing`, test:

```txt
answering asks
checking action blocked/enabled state
invoking acts
reading feedback
reading graph state
```

For `@intent/server`, test:

```txt
server action registration
server resource registration
policy registration
typed input/output skeleton behavior
```

Type tests are required for public APIs.

## GitHub Maintenance

When GitHub access is available, keep the repository updated.

Use the GitHub CLI if available:

```sh
gh repo view
gh issue list
gh pr list
gh pr create
gh pr view
gh pr edit
```

Before starting work:

1. Check current branch.
2. Check working tree status.
3. Pull latest changes from the remote.
4. Review open issues and PRs if relevant.
5. Create a focused branch for the task unless the user explicitly wants direct commits.

Branch naming:

```txt
feat/core-graph
feat/dom-renderer
feat/testing-api
fix/action-validation
docs/update-spec
chore/repo-setup
```

Commit style:

```txt
feat(core): add semantic graph builder
feat(dom): render basic login form
feat(testing): add semantic screen harness
fix(core): recompute action enabled state after validation
docs: update architecture notes
chore: configure pnpm workspace
```

Prefer small, focused commits.

Do not combine unrelated changes.

## GitHub Workflow

For normal tasks:

1. Create or use a task branch.
2. Implement the change.
3. Add or update tests.
4. Update docs if public behavior changes.
5. Run validation commands.
6. Commit changes.
7. Push the branch.
8. Open or update a PR if appropriate.
9. Summarize what changed and what validation passed.

Do not push directly to `main` unless the user explicitly asks or the repo is intentionally using direct-to-main development.

If the user asks the agent to keep GitHub updated, push meaningful completed work regularly.

Do not push broken work unless the branch is clearly marked as experimental and the user asked for checkpoint pushes.

## Pull Request Rules

When opening a PR, include:

```txt
summary
motivation
implementation notes
tests run
known limitations
follow-up work
```

PR description template:

```md
## Summary

## Why

## Changes

## Tests

## Known limitations

## Follow-up
```

Keep PRs small enough to review.

## Issue Management

When GitHub issues are available:

* Create issues for known follow-up work.
* Link PRs to issues when possible.
* Close issues only when the work is implemented, tested, and merged.
* Use clear labels if labels exist.

Suggested labels:

```txt
area:core
area:dom
area:server
area:testing
area:docs
area:repo
type:feature
type:bug
type:docs
type:chore
priority:high
priority:medium
priority:low
```

If labels do not exist, do not spend time creating a complex label system unless the user asks.

## Documentation Maintenance

Keep documentation synchronized with implementation.

Update docs when:

```txt
public API changes
package structure changes
architecture decisions change
MVP scope changes
commands change
examples change
```

The consolidated spec in `docs/` is the primary architecture source.

README should stay practical and onboarding-focused.

AGENTS.md should stay operational and agent-focused.

Do not duplicate the entire spec in README.

## README Maintenance

README should include:

```txt
project purpose
core idea
quick example
package list
setup commands
development commands
MVP status
links to docs
```

Keep README short enough to be useful.

## Changelog and Releases

Use Changesets when packages become publishable.

Before package publishing exists, maintain clear commits and PR summaries.

When publishing is introduced:

1. Add changesets for user-facing package changes.
2. Use semantic versioning.
3. Keep package changelogs generated from changesets.
4. Do not publish experimental packages accidentally.

## CI Expectations

If CI is not configured, add it once the basic repo works.

Minimum CI should run:

```txt
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm lint
```

Do not add heavy CI complexity before MVP.

## Code Style

Use TypeScript.

Prefer named exports.

Prefer explicit public types.

Prefer small modules.

Avoid clever abstractions before tests exist.

Avoid large dependency additions.

Prefer immutable graph definitions where possible.

Runtime mutable state is allowed only through explicit state, action, resource, or lifecycle APIs.

Use clear source locations and debug metadata where useful.

## Runtime Design Rules

The runtime should update semantic nodes, not rerender whole screens as the primary model.

Preferred reactive flow:

```txt
state changes
  → dependent semantic nodes update
  → renderer bindings update
```

The runtime should know product meaning:

```txt
this ask is invalid
this action is blocked
this resource is pending
this feedback is visible
this private state changed
```

This semantic knowledge is the framework’s advantage.

## DOM Renderer Rules

The DOM renderer must output real semantic HTML.

It should prefer native elements:

```txt
ask.contact.email → label + input type="email"
ask.secret → label + input type="password"
act.primary → button
feedback.live → output aria-live="polite"
surface.main → main
```

Do not use React for DOM rendering.

Do not hide generated DOM from browser DevTools.

The user should be able to inspect real HTML.

## Server Rules

Server package should model:

```txt
server.action
server.resource
server.policy
```

Internal app behavior should prefer server resources and actions.

Manual API routes are escape hatches.

Do not build full OpenAPI, WebSocket, SSE, jobs, files, or database adapters until the basic server model exists.

## Security and Privacy Rules

Privacy metadata must be preserved.

Examples:

```ts
$.ask("Email", email).private()
$.ask("Password", password).asSecret().private()
```

Private values should be redacted from:

```txt
logs
analytics
debug snapshots
semantic test snapshots
DevTools exports
AI inspection output
```

If redaction is not implemented yet, mark it as TODO and do not pretend it exists.

## Accessibility Rules

The DOM renderer should generate accessible output from semantic intent.

Required basics:

```txt
labels for inputs
required attributes for required asks
proper input types
aria-live output for feedback
disabled state for blocked actions
```

Future warnings should include:

```txt
destructive action without confirmation
secret ask not marked private
surface with multiple primary actions
flow reaches action before required asks
```

## Escape Hatches

Escape hatches are allowed but must be explicit.

Allowed future escape hatches:

```txt
raw DOM custom node
custom materializer
React island
React Native custom materializer
manual API route
```

Escape hatches must not become the default authoring model.

## What Not To Build Yet

Do not build these until the MVP works:

```txt
full design system
visual editor
AI assistant
complex compiler
full OpenAPI suite
full realtime layer
full database abstraction
full React Native renderer
complex router
SSR streaming
edge adapters
```

Build the dagger before the cathedral.

## Validation Before Completion

Before considering a task complete, run the relevant commands.

At minimum:

```sh
pnpm typecheck
pnpm test
pnpm build
```

Also run lint if configured:

```sh
pnpm lint
```

If a command fails, either fix it or clearly document the failure.

Do not say “all tests pass” unless they actually pass.

## Final Response Expectations

When reporting work, include:

```txt
what changed
files changed
tests run
results
known limitations
next recommended step
branch or PR link if available
```

Be honest.

If something was not completed, say so.

## Success Criteria For The MVP

The MVP is successful when:

1. The repo installs with `pnpm install`.
2. `pnpm build` passes.
3. `pnpm typecheck` passes.
4. `pnpm test` passes.
5. `examples/web-basic` renders a Login screen from semantic Intent code.
6. The Login screen uses no JSX and no manually authored DOM tree.
7. The DOM renderer outputs real semantic HTML.
8. Semantic tests can answer asks and assert action state.
9. Core has no DOM, React, React Native, Node, or server framework dependency.
10. The implementation preserves the central principle:

```txt
The source code is intent.
```

## Final Reminder

Protect the idea.

Do not let Intent become a prettier wrapper around components, DOM, or API routes.

Intent is a semantic application framework.

The source code is intent.
