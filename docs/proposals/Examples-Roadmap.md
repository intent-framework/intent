# Examples Roadmap — Design Proposal

**Status:** Implementing — Example 1 (`choice-form`) done in #108, Example 2 (`resource-lifecycle`) done in #111 
**Date:** 2026-06-26  
**Author:** Big Pickle  
**Affected packages:** `@intent-framework/core`, `@intent-framework/dom`, `@intent-framework/router`, `@intent-framework/testing`  
**Related lanes:** `example/*`

---

## Context

The repository currently has two examples:

| Example | Packages used | Tests? | Covers |
|---------|--------------|--------|--------|
| `canonical-invite` | core, dom, testing | Yes | Single screen, basic ask/act, surface, `inspectScreen()`, DOM renderer, test harness |
| `web-basic` | core, dom, router | No | Multi-screen routing, resources (autoLoad/reload), diagnostics panel, feedback, `$.flow`, Enter default action |

### Gap analysis

Features not demonstrated by *any* existing example:

- `ChoiceState` / `BooleanState` — only `TextState` is shown
- `$.ask("...").asChoice()` / `asSecret()` / `hint()` — unused
- Multiple surfaces per screen — all screens use one `"main"` surface
- `autoLoad: false` — every resource auto-loads
- Resource `"failed"` state and error handling — no example handles a load error
- Complex flows (>2 steps, branching) — `web-basic` has one 2-step flow
- `$.act().invalidates(...)` with precise resource targeting — shown but not tested
- Testing at all — web-basic has `"test": "echo 'no tests'"`, no example tests resources or flows through the harness
- `@intent-framework/server` — unused outside its own package tests
- `createScreenRuntime()` standalone — used only inside the testing harness

---

## Recommendation: 3 examples, built in order

### Example 1 — `choice-form`

**Goal:** Demonstrate every state kind (`TextState`, `ChoiceState`, `BooleanState`), every ask kind (`asChoice()`, `asSecret()`, `hint()`), and screens with multiple surfaces.

**Package coverage:**

| Package | Used for |
|---------|----------|
| `@intent-framework/core` | Screen definition, all state kinds, all ask kinds |
| `@intent-framework/dom` | DOM renderer — each surface renders as a separate `<section>` |
| `@intent-framework/testing` | Tests for each state/ask kind and surface membership |

**Exact files:**

```
examples/choice-form/
  index.html              — Vite entry
  package.json            — deps: core, dom; devDeps: testing, typescript, vite, vitest
  tsconfig.json           — standard example config
  vite.config.ts          — standard example config
  src/
    RegistrationForm.ts   — Screen with ChoiceState (role picker), BooleanState (TOS toggle),
                            TextState with asSecret() (password), hint() on fields,
                            two surfaces ("main" + "sidebar")
    RegistrationForm.test.ts — Tests: choice state read/write, secret ask validity,
                                BooleanState toggle, multi-surface membership
    main.ts               — Bootstrap: renderDom(), inspectScreen() log
```

**What it proves:**

- `$.state.choice(...)` and `ChoiceState<T>` type inference
- `$.state.boolean(...)` and `BooleanState` with `.toggle()`
- `$.ask("...").asChoice()` rendering as `<select>`
- `$.ask("...").asSecret()` rendering `<input type="password">`
- `$.ask("...").hint("...")` producing visible hint text
- Multiple `$.surface("name").contains(...)` per screen, each rendering independently
- `inspectScreen()` correctly reports choice, secret, and boolean nodes
- Test harness covers all state kinds

**Recommended order:** 1st — foundational state/ask coverage, no new dependencies.

---

### Example 2 — `resource-lifecycle`

**Goal:** Demonstrate the full resource lifecycle — autoLoad, manual load, reload, invalidation, stale detection, failed state, and `autoLoad: false` — with a self-contained test suite.

**Package coverage:**

| Package | Used for |
|---------|----------|
| `@intent-framework/core` | Screen definition, resource configs, runtime |
| `@intent-framework/dom` | DOM renderer |
| `@intent-framework/router` | Route params drive resource load context |
| `@intent-framework/testing` | Tests for every resource status transition |

**Exact files:**

```
examples/resource-lifecycle/
  index.html
  package.json            — deps: core, dom, router; devDeps: testing, typescript, vite, vitest
  tsconfig.json
  vite.config.ts
  src/
    ResourceDemo.ts       — Screen with 3 resources:
                            - auto-loaded resource with route context
                            - autoLoad: false resource
                            - resource that fails on load
    ResourceDemo.test.ts  — Tests:
                            - autoLoad resource reaches "ready"
                            - autoLoad: false stays "idle"
                            - reload transitions through "pending" to "ready"
                            - invalidate() sets stale
                            - reload() clears stale
                            - failed resource reports "failed" status and error
                            - action-driven invalidation with .invalidates()
    main.ts               — Bootstrap with router
```

**What it proves:**

- `$.resource("name", { load, autoLoad })` with `autoLoad: true` and `false`
- `resource.reload()` reloads and clears stale
- `resource.invalidate()` marks stale without reloading
- `$.act(...).invalidates(resource)` marks resources stale on action success
- Resource `"failed"` status after loader throws
- Route-driven resource load context
- `inspectScreen()` resource section with status, stale, error
- Test harness `app.resource()` methods: `status()`, `load()`, `reload()`, `invalidate()`, `stale()`

**Recommended order:** 2nd — depends only on patterns established by choice-form + router, which web-basic already uses.

---

### Example 3 — `secret-vault`

**Goal:** Demonstrate complex multi-step flows (3+ steps), `asSecret()` + `private()` combined, flow-sensitive diagnostics, and a multi-screen flow with the router.

**Package coverage:**

| Package | Used for |
|---------|----------|
| `@intent-framework/core` | Screen definitions, flow chains, secret asks |
| `@intent-framework/dom` | DOM renderer with flow-based rendering |
| `@intent-framework/router` | Navigation across a 3-screen flow |
| `@intent-framework/testing` | Tests for flow step sequencing, secret handling, diagnostics |

**Exact files:**

```
examples/secret-vault/
  index.html
  package.json            — deps: core, dom, router; devDeps: testing, typescript, vite, vitest
  tsconfig.json
  vite.config.ts
  src/
    vault/
      LoginScreen.ts      — Screen: username ask + secret password ask + login action.
                            Flow: startsWith(username ask).then(password ask).then(login action)
      VaultScreen.ts      — Screen: secret key ask (asSecret + private), decrypt action,
                            locked/unlocked state with BooleanState
      RecoveryScreen.ts   — Screen: recovery email ask, reset action, back-to-login action
    vault/
      router.ts           — Routes: login → vault → recovery → login
    vault/
      VaultFlow.test.ts   — Tests:
                            - LoginScreen flow steps are correct order
                            - Secret asks render as private valid
                            - diagnostics fire for unsurfaced nodes (intentional)
                            - VaultScreen decrypt blocked until secret is entered
                            - Full navigation flow through all 3 screens
    main.ts               — Bootstrap with renderRouter()
```

**What it proves:**

- Multi-step `$.flow().startsWith(A).then(B).then(C)` with 3+ steps
- `asSecret()` + `private()` combined — secret data that is also hidden from inspect output
- `$.ask(...).hint(...)` on secret fields for accessible instructions
- `BooleanState` for toggling view modes (locked/unlocked)
- Flow diagnostics surface in `inspectScreen()`:
  - `surfaced-node-not-in-any-flow` (intentional for demo)
  - no `orphaned-flow` or `flow-step-not-surfaced` in correct config
- `renderRouter()` with 3 screens and navigation between them
- `inspectScreen()` reports flow `stepCount` correctly
- test harness `app.act().toBeBlockedBy()` with secret conditions
- Keyboard Enter default action in a multi-screen context

**Recommended order:** 3rd — builds on routing and resource patterns, adds flow complexity.

---

## Summary

| Order | Example | New concepts | Packages | Est. files | Tests? |
|-------|---------|-------------|----------|------------|--------|
| 1 | `choice-form` | ChoiceState, BooleanState, asChoice, asSecret, hint, multi-surface | core, dom, testing | 7 | Yes |
| 2 | `resource-lifecycle` | autoLoad: false, failed status, manual load/reload, stale detection, invalidation | core, dom, router, testing | 7 | Yes |
| 3 | `secret-vault` | Complex flows (3+ steps), secret+private, flow diagnostics, multi-screen router app | core, dom, router, testing | 10 | Yes |

All three examples include tests. The testing harness (`@intent-framework/testing`) is currently only exercised by `canonical-invite` — these examples give it broader coverage across state kinds, resource semantics, and flow sequencing.

No example uses `@intent-framework/server` because it remains private/unpublished. Adding a server example should be a separate proposal when server is publishable.

---

## Relationship to existing examples

- `canonical-invite` stays as the minimal Quickstart match — clean one-to-one with `docs/Quickstart.md`.
- `web-basic` stays as the full demo — it covers routing + resources + diagnostics panel + data layer.
- The 3 new examples are *focused* (one concept per example) rather than a single monolithic demo. This makes them easier to read, test, and maintain.

---

## Open questions

1. **Should any example use `createScreenRuntime()` directly** (bypassing `testScreen` and `renderDom`) to demonstrate headless usage? Possibly as a standalone script in `resource-lifecycle`.

2. **Should `choice-form` include a `BooleanState`-gated surface** — e.g., a "Show advanced options" toggle that conditionally renders a second surface? This would demonstrate runtime surface visibility. Currently out of scope until surface visibility is a framework concept.

3. **Should `secret-vault` include an intentional diagnostic violation** to demonstrate `inspectScreen()` catching issues? The proposal includes one (`surfaced-node-not-in-any-flow`) for this purpose.

4. **Where should `pnpm dev:*` scripts be added?** Root `package.json` already has `dev:canonical` and `dev:web-basic`. Adding `dev:choice-form`, `dev:resource-lifecycle`, `dev:secret-vault` follows the existing pattern.

---

## Related

- `examples/canonical-invite/` — current Quickstart example
- `examples/web-basic/` — current demo
- `docs/Quickstart.md` — Quickstart guide matching canonical-invite
- `docs/Demo.md` — Demo guide matching web-basic
- `docs/Resources.md` — Resource semantics guide
- `packages/core/src/state.ts` — State types
- `packages/core/src/ask.ts` — Ask kinds
- `packages/core/src/flow.ts` — Flow builder
- `packages/testing/src/index.ts` — Test harness API
