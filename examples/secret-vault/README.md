# Secret Vault Example

A multi-screen password vault application demonstrating complex flows, secret asks with private mode, and flow diagnostics.

## What it demonstrates

- Multi-step `$.flow().startsWith(A).then(B).then(C)` with 3+ steps
- `asSecret()` + `private()` combined — secret data hidden from inspect output
- `asContact("email")` for email input with autocomplete
- `BooleanState` for toggling locked/unlocked view mode
- Flow diagnostics: `surfaced-node-not-in-any-flow` (intentional), no `orphaned-flow` or `flow-step-not-surfaced` in correct config
- `renderRouter()` with 3 screens and navigation between them
- `inspectScreen()` reporting flow `stepCount`
- Keyboard Enter default action in a multi-screen context

## Screens

1. **Login** — username ask + secret password ask + "Unlock vault" primary action. Flow: username → password → unlock.
2. **Vault** — two secret key asks + decrypt/lock actions + `BooleanState` for locked state. Flow: secret key → confirm key → decrypt.
3. **Recovery** — recovery email ask + "Reset vault" with feedback. Flow: email → reset.

## Run

```sh
pnpm install
pnpm dev:secret-vault
```

Open the local URL printed by Vite. Navigate between screens, enter credentials, unlock the vault.

## Test

```sh
pnpm test
```

Tests cover flow step sequencing, secret handling, diagnostics, and full navigation through all 3 screens.

## Compare

For a simpler single-screen example with basic asks and actions, see [`examples/canonical-invite`](../canonical-invite).
