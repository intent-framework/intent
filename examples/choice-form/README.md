# Choice Form Example

A registration form demonstrating every state kind and ask kind in Intent:

- `TextState` for name, email, and password fields
- `ChoiceState` for role selection (admin, member, viewer)
- `BooleanState` for terms acceptance
- `ask.asChoice()`, `ask.asSecret()`, `ask.hint()`
- Multiple surfaces (`main` + `sidebar`)
- Full `@intent-framework/testing` coverage

## Run

```sh
pnpm install
pnpm dev:choice-form
```

Open the local URL printed by Vite.

## Test

```sh
pnpm test
```

## What it proves

- All state kinds (`TextState`, `ChoiceState`, `BooleanState`) work end-to-end
- `asChoice()` renders choice input, `asSecret()` masks input, `hint()` provides guidance
- Multiple surfaces per screen are defined and inspected correctly
- Flow diagnostics (`flow-step-not-surfaced`, `orphaned-flow`) are absent for a correct configuration
- DOM build and test paths work without manual browser steps
