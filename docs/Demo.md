# Intent Demo Guide

Intent is a semantic application framework. You describe what the user is trying
to do — screens, state, questions, actions, resources, surfaces, routes — and
renderers materialize that graph into real interfaces. The DOM is one
materializer, not the source of truth. Router routes are transport, not the
product model. Server routes are transport, not the backend model. Tests assert
product semantics, not DOM trivia.

**Intent is not** a React clone, a JSX replacement, a UI kit, a component
library, or an API route framework.

---

## How to run the demo

```sh
pnpm dev:web-basic
```

Or from the example directory:

```sh
cd examples/web-basic
pnpm dev
```

Open `http://localhost:5173/` in a browser.

---

## What each screen demonstrates

### Home (`/`)

Three team entries rendered as independent buttons. Clicking one navigates to
team details. Shows that actions with `navigate()` produce navigable UI without
manual `<a>` tags.

### Team Details (`/teams/:teamId`)

A resource auto-loads team data using the route param. Three actions:
- **Refresh team** — calls `team.reload()`. Watch the version increment.
- **Invite member** (primary) — navigates to the invite form.
- **Back home** — navigates back.

Shows runtime-scoped resources, resource lifecycle, and multiple independent
actions on one surface.

### Invite (`/teams/:teamId/invite`)

A single ask (email) with a primary action gated on `emailAsk.valid`. The
**Send invite** button is blocked until a valid email is typed. Press **Enter**
to submit — the accessible hint appears automatically when the default action is
unambiguous. After success, the demo navigates back to team details with the
member count updated.

Shows semantic asks with validation, action blocked reasons, feedback states,
keyboard default action, and `$.flow` for interaction sequencing.

### Not Found (any other path)

A screen with no asks or actions. Demonstrates the fallback route.

---

## How the diagnostics panel works

Below each rendered screen, a `#diagnostics` panel shows output from
`inspectScreen()`. Clean screens display "✓ No diagnostics." When the graph has
potential issues (e.g., actions without surfaces, ambiguous primary actions),
diagnostics appear with severity, code, and message.

The panel is updated by a `MutationObserver` on `#root` that debounces through
`requestAnimationFrame`. This is demo infrastructure, not framework behavior.

---

## What to notice in the code

Open `examples/web-basic/src/` to see the demo split into screens, data, router,
and demo-only DOM panel helpers.

The entire app — four screens, router, data layer, diagnostics, and DOM updates
— fits in a small, responsibility-oriented structure because the framework
handles rendering, reactivity, validation, and lifecycle.

Key patterns:

- `screen<AppServices>("Name", $ => { ... })` defines a semantic screen.
- `$.state.text("email")` creates reactive state.
- `$.ask("Email", state).required().private()` declares a question the user
  must answer.
- `$.act("Send invite").primary().when(condition).does(handler)` declares an
  action with preconditions.
- `$.resource("team", { load })` declares async data with load/reload lifecycle.
- `$.flow("invite").startsWith(ask).then(action)` describes interaction order.
- `$.surface("main").contains(...)` groups asks and actions for rendering.
- `createRouter().route("name", "/path", Screen)` maps routes to screens.
- `renderRouter(router, { target, notFound })` renders the matched screen.
- `inspectScreen(screenDef)` returns typed diagnostics about the graph.

---

## 5-minute demo script

1. Open the Team Invite demo at `http://localhost:5173/`.
2. Explain: "This app is authored as semantic screens, asks, actions, resources,
   surfaces, and routes — not components or JSX."
3. Click **Open Alpha — team_1** on the Home screen.
4. Point at the `<h1>` screen heading ("Team Details") and the team info panel
   showing name, version, and member count.
5. Click **Refresh team**. Show the version number incrementing — the resource
   reloaded from the in-memory store.
6. Click **Invite member** to navigate to the invite form.
7. Show that **Send invite** is disabled. Hover over it or inspect the
   `disabled` attribute — the blocked reason is "Enter a valid email address."
8. Type a valid email. Watch the button become enabled and an Enter hint appear
   next to it.
9. Press **Enter** to submit. Show the feedback ("Sending invite...",
   "Invite sent.") and the automatic navigation back to team details.
10. Note that the member count now shows 1 member.
11. Scroll down to the **diagnostics panel** showing "✓ No diagnostics."
12. Explain: "`inspectScreen()` can reason about the semantic graph at any time
    — the DOM does not own the product truth."

---

## Known limitations

- Manual DOM side panels in the demo (`#team-info`, `#diagnostics`)
- `MutationObserver` used to update demo diagnostics panel (not framework
  behavior)
- In-memory data only — no backend persistence
- No SSR
- No native renderer yet
- No compiler yet
- Demo styling is minimal (inline CSS in `index.html`)

---

## What is intentionally not included yet

See the MVP scope in `AGENTS.md`. The following are explicitly out of scope for
the current MVP:

- `@intent-framework/devtools` — no DevTools extension or debugger UI
- `@intent-framework/openapi` — no OpenAPI contract generation
- `@intent-framework/realtime` — no WebSocket or SSE subscriptions
- `@intent-framework/react-native` — no native renderer
- `@intent-framework/compiler` — no build-time graph analysis
- Complex SSR, streaming hydration, or edge adapters
- Visual editor or AI assistant
- Design system or CSS framework integration
- Database abstraction or ORM integration
