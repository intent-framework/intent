# Team Invite Demo (web-basic)

A small multi-screen team invite application demonstrating routing, resources, diagnostics, feedback, and keyboard navigation.

## What it demonstrates

- Semantic screens defined without components or JSX
- Typed router navigation with route context
- Runtime-scoped resources with autoLoad and reload
- Ask validation with blocked action reasons
- Feedback output during action execution
- Keyboard Enter default action with accessible hint
- Opt-in screen-name headings
- Graph diagnostics via `inspectScreen()`

## Run

```sh
pnpm install
pnpm dev:web-basic
```

Open the local URL printed by Vite.

## What to inspect

1. Pick a team on the home screen.
2. View team details — resource loads team data from route params.
3. Click **Refresh team** — version increments as the resource reloads.
4. Click **Invite member** — navigate to the invite form.
5. The **Send invite** button is disabled until a valid email is typed.
6. Press **Enter** to submit — the accessible hint appears when the default action is unambiguous.
7. After success, the member count updates automatically.
8. Scroll to the diagnostics panel — `inspectScreen()` output for each screen.

## Walkthrough

For a guided 5-minute demo script, see [docs/Demo.md](../../docs/Demo.md).

For a deep dive into resource semantics, see [docs/Resources.md](../../docs/Resources.md).

## Screens

| Route | Screen | Purpose |
|-------|--------|---------|
| `/` | Home | Team selection |
| `/teams/:teamId` | Team Details | Resource-driven team view |
| `/teams/:teamId/invite` | Invite | Email ask with validation |
| `*` | Not Found | Fallback |
