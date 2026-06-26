# Inspect Screen and Diagnostics Guide

## What `inspectScreen` is

`inspectScreen()` turns a screen definition into a serializable semantic graph snapshot.

It is for debugging, documentation, tests, diagnostics, and future tooling (DevTools, analytics, code generation).

It is not a renderer. It does not produce DOM, test output, or server responses. It only shows the current state of a screen's semantic nodes and their diagnostics.

The function is exported from `@intent-framework/core`.

## Minimal usage

```ts
import { inspectScreen } from "@intent-framework/core"
import { InviteMember } from "./InviteMember.js"

const graph = inspectScreen(InviteMember)
console.log(JSON.stringify(graph, null, 2))
```

The canonical example at `examples/canonical-invite` does exactly this — it renders the screen to DOM and displays `inspectScreen()` output in a `<pre>` element on the same page:

```ts
const graph = inspectScreen(InviteMember)
inspect.textContent = JSON.stringify(graph, null, 2)
```

## What the graph contains

The returned `InspectedScreen` object contains:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Screen name from `screen("Name", ...)` |
| `semanticId` | `string` | Stable screen-level identifier |
| `asks` | `InspectedAsk[]` | Every ask node with current state |
| `acts` | `InspectedAct[]` | Every action node with current state |
| `flows` | `InspectedFlow[]` | Every flow with step count |
| `surfaces` | `InspectedSurface[]` | Every surface with item count |
| `resources` | `InspectedResource[]` | Every resource node (requires runtime resources) |
| `diagnostics` | `GraphDiagnostic[]` | Diagnostics for this screen |

Each ask includes: `id`, `semanticId`, `label`, `kind`, `required`, `isPrivate`, `valid`, `error`.

Each action includes: `id`, `semanticId`, `label`, `primary`, `enabled`, `blockedReasons`, `status`, `statusMessage`, `invalidates`.

Each resource includes: `id`, `semanticId`, `name`, `status`, `hasValue`, `stale`, `error`.

For a detailed explanation of resource lifecycle, runtime scoping, and invalidation, see the [Resources Guide](Resources.md).

Resources require passing runtime resource nodes:

```ts
const runtime = createScreenRuntime(MyScreen)
await runtime.start()
const graph = inspectScreen(MyScreen, runtime.resources)
```

## Semantic IDs

Semantic IDs are stable, deterministic identifiers generated from node labels.

Every node kind has a prefix:

| Node kind | Prefix | Example label | semanticId |
|-----------|--------|---------------|------------|
| Screen | `screen:` | `InviteMember` | `screen:invite-member` |
| Ask | `ask:` | `Email` | `ask:email` |
| Action | `action:` | `Invite member` | `action:invite-member` |
| Flow | `flow:` | `login` | `flow:login` |
| Surface | `surface:` | `main` | `surface:main` |
| Resource | `resource:` | `team` | `resource:team` |

### Rules

- **Deterministic**: the same label produces the same semantic ID every time, across any number of `inspectScreen()` calls.
- **Duplicate labels** get numeric suffixes: `ask:email`, `ask:email-2`, `ask:email-3`. The first occurrence keeps the unadorned ID.
- **Normalization**: labels are lowercased, whitespace becomes hyphens, and punctuation/symbols are stripped. `"Email!"` becomes `ask:email`.
- **Symbol-only labels** (e.g. `"!!!"`) produce numeric fallback IDs scoped to their kind: `action:1`, `action:2`.
- **Unrelated screens** do not affect each other's semantic IDs.

### Important

These IDs are for inspection, diagnostics, and future tooling. They are not:

- Public DOM `id` or `data-*` attributes (the DOM renderer uses its own naming conventions)
- User-facing strings
- Stable across screen definition changes (adding a new ask before an existing one can shift suffixes)

## Diagnostics available today

Current diagnostics codes, their severity, and meaning:

### `multiple-primary-actions`

- **Severity**: `warning`
- **What it means**: The screen defines more than one primary action. When multiple actions are marked `.primary()`, the default action behavior (Enter key) is ambiguous — the renderer does not know which one to trigger.
- **Triggers when**: Two or more actions call `.primary()` in the same screen.
- **Fix**: Designate at most one action as primary, or remove `.primary()` from the extras.

Example trigger:

```ts
const save = $.act("Save").primary()
const delete = $.act("Delete").primary()
```

### `secret-ask-not-private`

- **Severity**: `warning`
- **What it means**: An ask is marked `.asSecret()` but not `.private()`. Secret values (passwords, tokens) should also be marked private so they are excluded from debug snapshots, logs, and future tooling output.
- **Triggers when**: `.asSecret()` is called without `.private()`.
- **Fix**: Add `.private()` to the ask, or remove `.asSecret()` if the value is not sensitive.

Example:

```ts
$.ask("Password", password).asSecret()        // triggers diagnostic
$.ask("Password", password).asSecret().private() // no diagnostic
```

### `primary-action-without-blocked-reason`

- **Severity**: `info`
- **What it means**: A primary action has one or more blocking conditions (`.when(condition)`) but none of those conditions provide a human-readable blocked reason. Users will see the action disabled but will not know why.
- **Triggers when**: A primary action calls `.when(condition)` without the second argument, and no condition in that action provides a message.
- **Fix**: Add a blocked-reason string to each `.when()` call.

Example:

```ts
$.act("Submit").primary().when(emailAsk.valid) // triggers diagnostic
$.act("Submit").primary().when(emailAsk.valid, "Enter a valid email.") // no diagnostic
```

### `ask-not-in-surface`

- **Severity**: `warning`
- **What it means**: An ask node exists in the screen definition but is not included in any surface. Screens that do not surface their asks will not render those asks — they exist in the graph but are invisible in the DOM.
- **Triggers when**: A `$.ask(...)` is defined but never added to a `$.surface(...)`.
- **Fix**: Add the ask to a surface.

Example:

```ts
$.ask("Email", email)          // triggers diagnostic
$.surface("main").contains()   // ask not included
```

### `action-not-in-surface`

- **Severity**: `warning`
- **What it means**: Same as `ask-not-in-surface` but for action nodes. An action exists in the screen but is not surfaced.
- **Triggers when**: A `$.act(...)` is defined but never added to a `$.surface(...)`.
- **Fix**: Add the action to a surface.

Example:

```ts
$.act("Hidden")                // triggers diagnostic
$.surface("main").contains()   // action not included
```

### Diagnostic output format

Each diagnostic is a `GraphDiagnostic` object:

```ts
{
  severity: "warning",
  code: "secret-ask-not-private",
  message: "Secret ask should also be marked private.",
  nodeId: "ask_password",
  semanticNodeId: "ask:password"
}
```

- `severity`: `"info"`, `"warning"`, or `"error"` (errors not yet used).
- `code`: a machine-readable string suitable for filtering.
- `message`: human-readable explanation.
- `nodeId` (optional): the internal node ID of the affected node.
- `semanticNodeId` (optional): the semantic ID of the affected node, when applicable.

## Development workflow

### During screen authoring

While building a screen, call `inspectScreen()` to verify the graph structure:

```ts
const graph = inspectScreen(MyScreen)
console.log(graph.diagnostics)
```

This catches common mistakes before rendering: unsurfaced nodes, missing blocked reasons, ambiguous primary actions.

### In a debug panel

The canonical example and web-basic demo both display `inspectScreen()` output on the page. The demo's diagnostics panel calls `inspectScreen(screenDef)` and formats the diagnostics array:

```ts
const inspected = inspectScreen(screenDef)
if (inspected.diagnostics.length === 0) {
  el.textContent = "✓ No diagnostics."
} else {
  el.textContent = inspected.diagnostics.map(d =>
    `[${d.severity}] ${d.code}${d.nodeId ? ` (${d.nodeId})` : ""}: ${d.message}`
  ).join("\n")
}
```

See `examples/web-basic/src/demo-panels.ts` for the full pattern.

### In tests

Assert diagnostic presence in your test suite:

```ts
import { inspectScreen } from "@intent-framework/core"

test("no diagnostics for clean screen", () => {
  const inspected = inspectScreen(MyScreen)
  expect(inspected.diagnostics).toEqual([])
})

test("reports missing surface membership", () => {
  const inspected = inspectScreen(MyScreen)
  const unsurfaced = inspected.diagnostics.filter(
    d => d.code === "ask-not-in-surface"
  )
  expect(unsurfaced).toHaveLength(0)
})
```

### Semantic IDs in docs and snapshots

Semantic IDs are stable for the same screen definition, so they can appear in documentation and test snapshots. However, be aware that changes to label ordering (adding a duplicate label before an existing one) shifts numeric suffixes.

## Boundaries

The current graph inspection has deliberate limitations:

- **No full reachability analysis.** Diagnostics check surface membership but do not trace whether all nodes are reachable through flows or surfaces.
- **No route-wide graph inspection.** `inspectScreen()` inspects one screen at a time. There is no cross-screen or route-level graph snapshot yet.
- **No DevTools package yet.** There is no dedicated browser extension or DevTools panel. The web-basic demo uses a `MutationObserver`-driven DOM side panel.
- **DOM renderer can expose semantic IDs as data attributes.** The DOM renderer uses its own `id` conventions for accessibility. Pass `showSemanticIds: true` to `renderDom()` to emit `data-intent-screen`, `data-intent-surface`, `data-intent-ask`, and `data-intent-action` attributes on rendered elements.
- **Resource graph inspection exists.** `inspectScreen()` accepts runtime resource nodes and reports status, staleness, and errors. However, cache and staleness semantics are still early — there is no automatic reload, polling, or TTL-based invalidation.
- **No visual diff or time-travel debugging.** Graph snapshots are static. There is no history of state changes over time.
