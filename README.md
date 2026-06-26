# Intent

**Product intent is the program.**

Intent is an experimental TypeScript framework for describing applications as a semantic graph of screens, state, asks, actions, resources, routes, and surfaces.

It is not trying to make JSX nicer. It is not trying to wrap React. It is not a UI kit.

Intent asks a different question:

> What if the source of truth for an app was not components, DOM nodes, routes, or handlers, but the product intent itself?

The DOM is one possible output. A server route is one possible transport. A test harness is one possible observer. The product model lives above them.

## Status

Intent is early and experimental.

The current repository proves the core shape:

- Platformless semantic core
- DOM renderer
- Typed router
- Runtime-scoped resources
- Resource reload and invalidation
- Independent executable actions
- Keyboard Enter default action
- Accessible Enter hints
- Screen-name headings
- Graph diagnostics via `inspectScreen()`
- Semantic test harness
- A runnable web demo
- CI clean-dist validation

It is not production-ready yet. The goal right now is to keep the foundation small, inspectable, and hard to fake.

## Install

Intent is available as experimental alpha packages on npm:

```sh
pnpm add @intent-framework/core@0.1.0-alpha.7 @intent-framework/dom@0.1.0-alpha.7 @intent-framework/router@0.1.0-alpha.7 @intent-framework/testing@0.1.0-alpha.7
```

```sh
npm install @intent-framework/core@0.1.0-alpha.7 @intent-framework/dom@0.1.0-alpha.7 @intent-framework/router@0.1.0-alpha.7 @intent-framework/testing@0.1.0-alpha.7
```

The quickstart pins the current alpha version so examples match the published APIs.

```txt
Current alpha: v0.1.0-alpha.7
First public alpha: v0.1.0-alpha.0
GitHub Releases: https://github.com/intent-framework/intent/releases
```

Published packages:

| Package | npm |
|---------|-----|
| [`@intent-framework/core`](packages/core) | Platformless semantic graph and runtime |
| [`@intent-framework/dom`](packages/dom) | DOM materializer for screens and router |
| [`@intent-framework/router`](packages/router) | Typed route definitions and navigation |
| [`@intent-framework/testing`](packages/testing) | Semantic test harness |

`@intent-framework/server` remains private and unpublished.

This is experimental alpha software. APIs are subject to change. Not recommended for production use.

## Quickstart

See [docs/Quickstart.md](docs/Quickstart.md) for a step-by-step guide — install, define a screen, render it, test it, and inspect the semantic graph.

## Why Intent exists

Modern app code often scatters product meaning across UI components, route files, data hooks, form handlers, test selectors, and backend endpoints.

Intent tries to keep the meaning in one graph.

Instead of starting with:

```txt
Which component renders this?
Which route owns this?
Which handler mutates this?
Which selector does the test click?
```

Intent starts with:

```txt
What is the screen?
What does the user need to provide?
What actions are possible?
When is an action blocked?
What resource does this screen depend on?
What should tests be able to assert semantically?
```

The renderer then materializes that graph.

## Tiny example

```ts
import { screen, state } from "@intent-framework/core"

export const InviteScreen = screen("Invite", $ => {
  const email = $.state.text("email")

  const emailAsk = $.ask("Email", email)
    .asContact("email")
    .required()

  const sendInvite = $.act("Send invite")
    .primary()
    .when(emailAsk.valid, "Enter a valid email.")
    .does(async ({ navigate }) => {
      // product behavior goes here
      navigate?.("team")
    })

  $.surface("main").contains(emailAsk, sendInvite)
})
```

This defines more than UI.

It defines:

* A screen named `Invite`
* A semantic email ask
* A required validation condition
* A primary action
* A blocked reason
* A surface containing product-relevant nodes
* Something renderers, tests, and diagnostics can inspect

## What Intent is

Intent is a semantic application graph.

It gives names and behavior to product-level concepts:

* `screen`
* `state`
* `ask`
* `act`
* `condition`
* `resource`
* `surface`
* `flow`
* `route`

Renderers and adapters then materialize that graph into specific environments.

Today, the repository includes a DOM renderer, a router, a server package, and a testing package. More targets can exist later without making the core depend on them.

## What Intent is not

Intent is not:

* A React clone
* A JSX replacement
* A component library
* A UI kit
* A CSS framework
* An API route framework
* A backend framework
* A compiler yet
* A native renderer yet
* A DevTools package yet

Those may become outputs, adapters, or tools around the graph. They are not the center.

## Core idea

Intent separates product meaning from output mechanics.

```txt
Product graph     → screen, ask, action, resource, route, surface
Runtime           → state, conditions, blocked reasons, feedback, resource lifecycle
Materializers     → DOM, tests, server adapters, future native/devtools/compiler
```

The DOM is an output, not the language.

Routes are navigation, not the product model.

API routes are transport, not the backend model.

Tests should assert product semantics, not DOM trivia.

## Packages

This repository currently contains:

| Package           | Purpose                                 |
| ----------------- | --------------------------------------- |
| [`@intent-framework/core`](packages/core)    | Platformless semantic graph and runtime |
| [`@intent-framework/dom`](packages/dom)     | DOM materializer for screens and router |
| [`@intent-framework/router`](packages/router)  | Typed route definitions and navigation  |
| [`@intent-framework/testing`](packages/testing) | Semantic test harness                   |
| `@intent-framework/server`  | Early server-side package               |

The core package must remain platformless. It should not import DOM, React, router internals, server framework code, or native APIs.

## Run the canonical example

Install dependencies:

```sh
pnpm install
```

Run the canonical example (matches the Quickstart one-to-one):

```sh
pnpm dev:canonical
```

Open the local URL printed by Vite.

The example shows a single InviteMember screen — an email ask, a primary invite action blocked until the email is valid, and `inspectScreen()` output displayed on the page.

For a more complete demo with routing, resources, and diagnostics, see:

```sh
pnpm dev:web-basic
```

Open the local URL printed by Vite.

The demo shows a small team invite flow:

1. Pick a team.
2. View team details.
3. Refresh the team resource.
4. Open the invite screen.
5. Try to send with an empty or invalid email.
6. Type a valid email.
7. Press Enter or click Send invite.
8. Return to team details and see the member count update.
9. Inspect the diagnostics panel.

For a guided walkthrough, see [Demo Guide](docs/Demo.md).

For a deep dive into resource semantics — load, reload, invalidation, staleness, and runtime scoping — see the [Resources Guide](docs/Resources.md).

## Examples

The repository includes five runnable examples, each demonstrating a different set of Intent capabilities:

| Example | What it demonstrates |
|---------|---------------------|
| [`canonical-invite`](examples/canonical-invite) | Minimal screen: text ask, primary action, validation, blocked reasons, feedback, `inspectScreen()`. Matches the Quickstart one-to-one. |
| [`choice-form`](examples/choice-form) | All state kinds (text, choice, boolean) and ask kinds (`asChoice()`, `asSecret()`, `hint()`), multiple surfaces per screen, flow diagnostics, full test coverage. |
| [`resource-lifecycle`](examples/resource-lifecycle) | Full resource lifecycle: autoLoad, manual load, reload, invalidation, stale detection, failed state, action-driven invalidation with `.invalidates()`. |
| [`secret-vault`](examples/secret-vault) | Multi-step flows (3+ steps), `asSecret()` + `private()`, `BooleanState` toggles, multi-screen router app, flow diagnostics. |
| [`web-basic`](examples/web-basic) | Multi-screen team invite demo with router, resources, diagnostics panel, feedback, and keyboard default action. |

Each example includes tests. Run with `pnpm dev:<name>` (e.g. `pnpm dev:choice-form`) and test with `pnpm test` from the example directory.

## What the demo demonstrates

The `web-basic` demo is intentionally small. It is a dagger, not a cathedral.

It demonstrates:

* Semantic screens
* Independent actions rendered as buttons
* Typed router navigation
* Route context passed into actions and resources
* Runtime-scoped resources
* Resource reload
* Ask validation
* Blocked action reasons
* Feedback output
* Keyboard Enter default action
* Accessible Enter hint
* Opt-in screen-name headings
* Graph diagnostics via `inspectScreen()`
* Clean-dist CI validation

## Testing philosophy

Intent tests should speak product language.

Instead of testing only DOM selectors, tests can ask questions like:

```txt
Is this action enabled?
Why is this action blocked?
What happens when this ask is answered?
What resources does this screen expose?
What diagnostics does this graph produce?
```

The testing package exists so product behavior can be checked without pretending the DOM is the source of truth.

## Diagnostics

Intent can inspect a screen graph through `inspectScreen()`.

Diagnostics currently catch graph-level issues such as:

* Multiple primary actions
* Secret asks that are not private
* Primary actions blocked without a human-readable reason
* Asks not included in a surface
* Actions not included in a surface
* Surfaces including nodes that no flow references
* Flow steps referencing nodes not in any surface
* Flows whose steps are entirely disconnected from surfaces

Diagnostics are not lint rules for HTML. They are semantic graph feedback.

For a detailed walkthrough of diagnostics, semantic IDs, and development workflow, see the [Inspect Screen and Diagnostics Guide](docs/Inspect-Screen.md).

For a focused guide on debugging rendered DOM by mapping semantic IDs to `data-intent-*` attributes, see the [Semantic DOM Debugging Guide](docs/Semantic-DOM-Debugging.md).

## Development

Run clean validation locally:

```sh
rm -rf packages/*/dist examples/*/dist
pnpm test
pnpm typecheck
pnpm build
pnpm lint
```

CI runs the same clean-dist validation on every pull request and every push to `main`.

The clean-dist step matters. It prevents tests from accidentally passing because of stale package output.

OpenCode workflow commands live in `.opencode/README.md`.

## Current limitations

Intent is still missing many things on purpose.

Current limitations include:

* No compiler yet
* No native renderer yet
* No SSR story yet
* No backend persistence yet
* No real resource cache policy yet
* No DevTools package yet
* Automated version PR workflow and manual publish workflow are set up (Changesets configured)
* Demo side panels use manual DOM
* Demo diagnostics panel uses `MutationObserver`
* Demo data is in memory only

These are not hidden. They are the next architectural decisions.

## Design rules

Intent should stay small and semantically sharp.

Core rules:

* Core stays platformless.
* DOM does not own product truth.
* Router does not own product truth.
* Server routes are transport.
* Public behavior gets tests.
* Types should stay precise.
* Avoid `any`.
* Avoid renderer-specific leakage into core.
* Prefer semantic primitives over framework glue.

## Roadmap

Completed:

* ✦ Three focused examples: `choice-form`, `resource-lifecycle`, `secret-vault` — covering all state kinds, choice/secret asks, multi-surface screens, resource lifecycle (autoLoad, reload, invalidation, failed state), complex flows, secret+private, and flow diagnostics
* ✦ DOM multi-surface rendering — each surface renders as a semantic `<section>` with surface-suffixed DOM ids, shared state, duplicate controls, and per-surface blocked reasons and feedback

Near-term work:

* Harden the demo path
* Improve graph diagnostics
* Add better resource semantics
* Add richer documentation
* Explore DevTools-style graph inspection
* Clarify server-side intent boundaries

Not yet:

* Compiler
* Native renderer
* SSR
* Production persistence
* Styling system
* Component ecosystem

See [MVP Checkpoint](docs/MVP-Checkpoint.md) for the current implementation boundary.

See [Release Readiness](docs/Release-Readiness.md) for the current npm publishing and release plan.

## Project thesis

Intent should let a product flow be authored once as meaning, then observed or materialized many ways.

A screen should be understandable before it becomes DOM.

An action should be testable before it becomes a button.

A resource should be inspectable before it becomes a fetch call.

A route should navigate the product graph, not become the product graph.

That is the line Intent is trying to hold.
