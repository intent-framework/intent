# Canonical Invite Example

A minimal Intent application demonstrating the core pattern:

```txt
Screen intent → Semantic graph → Materialized output (DOM, tests, diagnostics)
```

This example matches the [Quickstart](../../docs/Quickstart.md) one-to-one.

## Run

```sh
pnpm install
pnpm dev:canonical
```

Open the local URL printed by Vite.

## What it proves

- A semantic screen can be defined without DOM, components, or markup.
- Asks can validate input and block actions with human-readable reasons.
- The DOM renderer materializes the graph into real, inspectable HTML.
- Actions produce feedback visible to the user.
- The semantic graph can be inspected via `inspectScreen()`.
- Tests can assert product behavior without touching the DOM.

## Test

```sh
pnpm test
```

## Compare

For a more complete example with routing, resources, and multiple screens, see [`examples/web-basic`](../web-basic).
