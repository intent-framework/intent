---
model: opencode/big-pickle
description: Check release readiness without publishing. Inspect versions, changesets, packing, and workflows.
---

You are working on the Intent repository at `intent-framework/intent`.

## Task

Check release readiness.

## Instructions

Inspect the following:

- Package versions in each package's `package.json`
- Changesets pre mode (`.changeset/pre.json`)
- `pnpm changeset status` output
- `pnpm pack:check` for publishable packages
- Publishable packages only:
  - `@intent-framework/core`
  - `@intent-framework/dom`
  - `@intent-framework/router`
  - `@intent-framework/testing`
- `@intent-framework/server` must remain private
- GitHub workflows (`.github/workflows/ci.yml`, `publish-alpha.yml`, `version-packages.yml`)

## Safety

Do not publish unless arguments explicitly say "publish now".
Even then, stop and report the exact command you intend to run before publishing.
