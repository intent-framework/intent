# AGENTS.md

## Purpose

This repository contains **Intent**, a semantic full-stack interaction framework for TypeScript applications.

Intent is not a React clone, JSX replacement, component library, UI kit, or API route framework.

Core principle:

```txt
Product intent is the program.
```

The source code should describe product meaning through semantic primitives:

```txt
screen
state
ask
act
flow
surface
resource
condition
route
runtime
```

Renderers and adapters materialize that graph into concrete output:

```txt
DOM
server transport
tests
router behavior
future native output
future SSR
future DevTools
future OpenAPI
future realtime
```

For web:

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

Protect this idea.

Do not let Intent become a prettier wrapper around components, DOM nodes, or API routes.

---

## Required Reading Before Meaningful Work

Before making non-trivial changes, read:

```txt
README.md
AGENTS.md
docs/*.md
```

If there is a consolidated specification in `docs/`, treat it as the main architecture source.

If implementation and docs disagree:

1. Prefer the current implementation for local mechanics.
2. Prefer the docs/spec for architectural direction.
3. Preserve compatibility unless the task explicitly asks for a breaking change.
4. Mention the mismatch in the completion report.

---

## Current MVP Scope

The current MVP focuses on:

```txt
@intent/core
@intent/dom
@intent/testing
@intent/server
@intent/router
examples/web-basic
```

Do not start these without explicit user direction:

```txt
@intent/devtools
@intent/openapi
@intent/realtime
@intent/react-native
@intent/compiler
complex SSR
complex server adapters
visual editor
AI assistant
design system
database abstraction
```

Build the dagger before the cathedral.

---

## Non-Negotiable Architecture Rules

### Core

`@intent/core` must stay semantic and platformless.

It must not depend on:

```txt
DOM APIs
React
React Native
Node-specific APIs
server frameworks
CSS or styling libraries
browser globals
```

Core may model semantic concepts such as:

```txt
screen
state
ask
act
flow
surface
resource
condition
runtime
inspection
services
```

Core must not model renderer-specific concepts as first-class authoring primitives:

```txt
div
button
input
form
section
view
text
pressable
CSS class
HTTP route handler
React component
```

### DOM

`@intent/dom` may depend on:

```txt
@intent/core
@intent/router
```

It must not depend on React.

It should output real semantic HTML:

```txt
main
form
label
input
button
output aria-live="polite"
```

Browser DevTools should show real, inspectable DOM.

### Router

`@intent/router` may depend on:

```txt
@intent/core
```

It must preserve typed route params and service typing.

Do not make core depend on router.

### Server

`@intent/server` may depend on:

```txt
@intent/core
```

Prefer Web API concepts:

```txt
Request
Response
Headers
URL
ReadableStream
```

Do not require Express, Fastify, Hono, Next, Remix, or any specific framework in core server logic.

---

## Type Safety Rules

Type safety is part of the product.

Avoid `any`.

Use `unknown` at true boundaries and narrow it.

Preserve literal inference.

Prefer typed handles over loose strings.

Do not force tests through unsafe casts such as:

```ts
value as unknown as never
```

If a public API needs a cast to use normally, fix the public API or explain why the test is intentionally crossing an internal boundary.

Valid public APIs should feel like this:

```ts
const role = $.state.choice("role", {
  initial: "viewer",
  options: ["viewer", "editor", "admin"] as const,
})

role.set("editor")
```

Invalid values should fail typechecking:

```ts
role.set("owner")
```

---

## Repetitive Task Workflow

For every task:

1. Inspect repo status.
2. Start from latest `main` unless the user says otherwise.
3. Create a focused branch.
4. Make the smallest coherent change.
5. Add or update tests.
6. Update README, AGENTS, or docs if public behavior or workflow changes.
7. Run validation.
8. Open or update a PR.
9. Report exactly what changed.

Do not batch unrelated work.

One PR should answer one question.

Good branch names:

```txt
feat/dom-keyboard-default-action
feat/resource-refresh-actions
fix/router-typed-params
test/router-runtime-resource-isolation
docs/update-agents-workflow
chore/reliable-test-workflow
```

Good commit titles:

```txt
feat(core): add runtime-scoped resource instances
feat(dom): render each action as independent button
test(dom): add router resource isolation regressions
chore: make vitest resolve workspace packages to source
docs: clarify agent workflow
```

---

## GitHub Workflow

When GitHub access is available:

1. Check open PRs if the task may depend on them.
2. Verify whether relevant PRs are merged before building on them.
3. Do not assume the user’s status report is enough if a GitHub check is easy.
4. Use focused PRs.
5. Keep PR bodies accurate after patches.
6. If a PR body says old test counts, old file counts, or old limitations, update it before merge.

PR description template:

```md
## Summary

## Why

## Changes

## Tests

## Known limitations

## Follow-up
```

A completion report should include:

```txt
branch
base branch
commit hash
PR link
files changed
implementation summary
tests added or updated
validation results
known limitations
next recommended step
```

Do not push directly to `main` unless explicitly asked.

---

## Validation Rules

Before saying a task is complete, run:

```sh
rm -rf packages/*/dist examples/*/dist
pnpm test
pnpm typecheck
pnpm build
pnpm lint
```

Do not say “all tests pass” unless they actually pass.

If only package-scoped validation was run, say that clearly.

After PR #25, root `pnpm test` must work without prior build. Downstream Vitest configs resolve workspace packages to source so tests do not read stale `dist/` output.

This command must pass from clean dist:

```sh
rm -rf packages/*/dist examples/*/dist
pnpm test
```

`pnpm build` is still required for production artifacts.

If validation fails:

1. Fix it, or
2. Clearly report the failure and why it remains.

Do not hide failed commands.

CI runs the same clean-dist validation expected locally.

---

## Testing Rules

Add tests for every meaningful behavior.

### Core tests should cover

```txt
graph creation
state updates
choice state type inference
ask registration
required validation
custom validation
condition updates
action enabled/blocked status
action blocked reasons
action lifecycle
feedback
flow registration
surface registration
resource lifecycle
resource invalidation
resource reload
runtime-scoped resource isolation
graph inspection
service typing
```

### DOM tests should cover

```txt
semantic HTML output
labels
input types
required fields
private/secret rendering behavior
disabled actions
blocked reasons
aria-describedby
feedback output
aria-live
state-driven updates
multiple independent actions
keyboard default action behavior
resource reload from actions
router integration when relevant
```

### Router tests should cover

```txt
route matching
typed route params
unique route names and paths
path generation
navigation service typing
route context injection
renderRouter navigation
runtime/resource behavior across navigation
```

### Testing package tests should cover

```txt
answering asks
reading ask state
checking action enabled/blocked state
checking blocked reasons
running actions
reading feedback
reading resources
runtime services
```

### Server tests should cover

```txt
server action skeleton behavior
server resource skeleton behavior
policy skeleton behavior
typed input/output surfaces
```

Type tests are required for public API changes.

---

## DOM Renderer Behavior Rules

DOM renderer behavior should follow product semantics.

Actions:

```txt
render each action as its own executable button
button click executes that specific action
use runtime.executeAct(action)
preserve blocked/disabled state per action
show feedback for the clicked action
```

Keyboard default action:

```txt
Enter in an ask input executes the default action only when unambiguous
single primary action wins
else single total action wins
else do nothing
do not execute blocked actions
ignore Shift/Meta/Ctrl/Alt+Enter
skip textarea targets
```

Resources:

```txt
resource autoload belongs to runtime
resource instances are runtime-scoped
ResourceRef is a definition-time handle
ResourceRef.reload() should reload the connected runtime resource
manual reload should use last known runtime context
invalidation marks stale and does not auto-reload unless explicitly implemented
```

Router:

```txt
route context is a runtime service
resource loaders may read route context
navigating to a different route should create the correct runtime context
do not make core import router
```

---

## Resource Rules

Resources are semantic runtime concepts, not global mutable singletons.

Current rules:

```txt
ScreenRuntime owns ResourceNode instances
screen.resource returns a ResourceRef definition-time handle
ResourceRef proxies the currently connected runtime node
dispose disconnects refs using node ownership guards
runtime.executeAct enriches context internally for invalidation
resource loaders receive pure services, not internal symbols
```

Manual refresh should be written as:

```ts
const refresh = $.act("Refresh")
  .does(async () => {
    await resource.reload()
  })
```

Do not introduce global resource caches, polling, visibility refresh, or cross-screen invalidation unless the task explicitly asks for it.

---

## Accessibility Rules

Generated DOM should be accessible by default.

Required basics:

```txt
labels for inputs
proper input types
required attributes for required asks
disabled state for blocked actions
aria-describedby for blocked reasons
aria-live output for feedback
real buttons for actions
keyboard default action when unambiguous
```

Future warnings may include:

```txt
destructive action without confirmation
secret ask not marked private
surface with ambiguous primary actions
flow reaches action before required asks
private state exposed to debug output
```

Do not claim accessibility support that is not implemented or tested.

---

## Security and Privacy Rules

Privacy metadata must be preserved.

Examples:

```ts
$.ask("Email", email).private()
$.ask("Password", password).asSecret().private()
```

Private values should eventually be redacted from:

```txt
logs
analytics
debug snapshots
semantic test snapshots
DevTools exports
AI inspection output
```

If redaction is not implemented yet, mark it as TODO.

Do not pretend it exists.

---

## Documentation Rules

Update documentation when:

```txt
public API changes
package structure changes
commands change
validation workflow changes
examples change
architecture decisions change
known limitations change
```

README should stay practical and onboarding-focused.

AGENTS.md should stay operational and agent-focused.

Docs in `docs/` should hold architecture and specification-level material.

Do not duplicate the entire spec in README or AGENTS.

---

## README Rules

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

Keep it short enough to be useful.

If example code changes, make sure README code still typechecks conceptually.

---

## Dependency Rules

Do not add dependencies casually.

Before adding a dependency, ask:

```txt
Can this be done with TypeScript and platform APIs?
Does this belong in core?
Is this dependency runtime or dev-only?
Does this create framework lock-in?
Does this weaken the semantic model?
```

Core should have zero runtime dependencies if possible.

DOM should use browser APIs directly.

Server should prefer Web APIs.

---

## Escape Hatch Rules

Escape hatches are allowed, but explicit.

Possible future escape hatches:

```txt
raw DOM custom node
custom materializer
React island
React Native custom materializer
manual API route
server adapter bridge
```

Escape hatches must not become the default authoring model.

Keep them isolated.

---

## What Not To Build Without Explicit Direction

Do not build these unless the user explicitly asks:

```txt
full design system
visual editor
AI assistant
complex compiler
full OpenAPI suite
full realtime layer
database abstraction
full React Native renderer
complex router
SSR streaming
edge adapters
global resource cache
cross-screen invalidation
resource polling
resource visibility refresh
```

---

## Completion Report Format

Every completed task should end with:

```txt
Branch:
Base:
Commit:
PR:
Files changed:
Summary:
Tests:
Validation:
Known limitations:
Next recommended step:
```

If work is incomplete, say what remains.

If a command failed, include the failed command and error summary.

If only partial validation was run, say so plainly.

---

## Final Reminder

Intent is a semantic application framework.

The source code is intent.

The DOM is output.

API routes are transport.

Native components are output.

Protect the idea.
