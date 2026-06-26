# Intent MVP Checkpoint

## Date

2026-06-26

## Current status

Intent is an early experimental TypeScript framework for semantic application graphs.

It now has:

- platformless core
- DOM renderer
- typed router
- semantic testing harness
- early server package
- runtime-scoped resources
- action blocked reasons
- graph diagnostics
- accessible keyboard behavior
- screen-name headings
- web-basic team invite demo
- demo guide
- rewritten README
- GitHub Actions CI clean-dist validation

## What is proven

- An npm-first quickstart guides new developers through install, definition, rendering, testing, and graph inspection.
- A canonical runnable example (`examples/canonical-invite`) matches the quickstart one-to-one.
- Screens can be authored semantically.
- DOM can materialize the graph without being the source of truth.
- Actions can be independently executable.
- Ask validation can block actions with human-readable reasons.
- Resources can be runtime-scoped and reloaded.
- Router can inject typed navigation and route context.
- Tests can assert semantic behavior.
- `inspectScreen()` can surface graph diagnostics with deterministic semantic node IDs.
- A small reviewer-friendly demo can be run locally.
- CI can enforce clean-dist validation.

## What is not proven yet

- Production scale.
- Native rendering.
- SSR.
- Compiler/static analysis.
- DevTools.
- Real backend persistence.
- Resource cache policy.
- Complex nested routing/layouts.
- Form arrays or complex forms.
- Styling/theming story.
- Production package publishing flow (first alpha published, need to validate end-to-end).

## Implemented packages

- `@intent-framework/core` — semantic graph and runtime ([packages/core](../packages/core))
- `@intent-framework/dom` — DOM materializer ([packages/dom](../packages/dom))
- `@intent-framework/router` — typed route definitions ([packages/router](../packages/router))
- `@intent-framework/testing` — semantic test harness ([packages/testing](../packages/testing))
- `@intent-framework/server` — early server package ([packages/server](../packages/server))

## Implemented primitives

- `screen` — semantic interaction space
- `state` — reactive model (text, choice, boolean)
- `ask` — user-facing question with validation
- `act` — executable action with preconditions, lifecycle, and feedback
- `condition` — derived boolean with human-readable label
- `resource` — async state with load/reload lifecycle
- `surface` — named containment surface
- `flow` — interaction order

## Demo state

The `examples/web-basic` package contains a small team invite demo with four screens, router, data layer, diagnostics, and DOM rendering. Source is split by responsibility across `types.ts`, `data.ts`, `screens.ts`, `router.ts`, `demo-panels.ts`, and `main.ts`.

Demo demonstrates: semantic screens, independent actions, router navigation, route context, runtime-scoped resources, resource reload, ask validation, blocked reasons, feedback, keyboard default action, accessible hint, screen-name headings, and graph diagnostics.

Demo limitations: manual DOM side panels, `MutationObserver`-driven diagnostics panel, in-memory data only, minimal styling.

## Validation state

- CI runs clean-dist validation on every PR and push to `main`.
- Validation: `rm -rf packages/*/dist examples/*/dist` then `pnpm test && pnpm typecheck && pnpm build && pnpm lint`.
- Tests assert semantic behavior via `@intent-framework/testing` and core inspection APIs.

## Architectural boundaries

- Core must remain platformless.
- DOM must not own product truth.
- Router must not become the product model.
- Server routes are transport.
- Tests should assert semantics, not DOM trivia.
- Renderer-specific behavior must not leak into core.

## Known limitations

See also the README [Current limitations](../README.md#current-limitations).

- No compiler yet.
- No native renderer yet.
- No SSR story yet.
- No backend persistence yet.
- No real resource cache policy yet.
- No DevTools package yet.
- Package publishing flow is set up (Changesets + manual publish workflow). First alpha published.
- Demo side panels use manual DOM.
- Demo diagnostics panel uses `MutationObserver`.
- Demo data is in memory only.

## Biggest risks

- Becoming a component framework with semantic names.
- DOM accumulating too much product logic.
- Resource model becoming a hidden data-fetching framework without clear semantics.
- Router becoming the app model.
- Diagnostics staying too shallow.
- Public API widening before the core is stable.
- Demo polish hiding missing backend/native/compiler stories.

## Do not build next

Do not jump into these without a very specific narrow PR:

- React adapter
- Native renderer
- Compiler
- Visual editor
- Styling system
- OpenAPI generator
- Full DevTools package
- Backend framework

## Proven

- ✅ Canonical example app (`examples/canonical-invite`) — new developers can clone and run after the quickstart. See [Canonical Invite Example](../examples/canonical-invite).
- ✅ `inspectScreen()` diagnostics guide (`docs/Inspect-Screen.md`) — documents all five current diagnostics, semantic ID behavior, development workflow, and boundaries.

## Documented

- ✅ `inspectScreen()` diagnostic guide (`docs/Inspect-Screen.md`) — covers graph contents, all five current diagnostics, semantic ID behavior, development workflow, and current boundaries.
- ✅ Resource semantics guide (`docs/Resources.md`) — covers resource lifecycle, runtime scoping, ResourceRef vs ResourceNode, invalidation, loader context, and current boundaries.

## Recommended next moves

1. ~~Add a tiny diagnostics/dev-inspection page or command that prints `inspectScreen()` output for demo screens without `MutationObserver`.~~ (Covered by the diagnostic guide documenting the `demo-panels.ts` pattern.)
2. ~~Improve resource semantics documentation: runtime-scoped resources, reload, stale, invalidation, context.~~ (Covered by docs/Resources.md.)
3. Add one or two graph diagnostics that catch real authoring mistakes before adding any new package.
