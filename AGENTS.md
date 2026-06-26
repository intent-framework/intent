# AGENTS.md

## Intent Project Identity

This repository contains **Intent**, a semantic full-stack interaction framework for TypeScript applications.

Intent is **not** a React clone, JSX replacement, component library, UI kit, or API route framework.

```txt
Product intent is the program.
```

The DOM is output. API routes are transport. Native components are output. Protect this idea.

## Required Reading

Before non-trivial changes, read:
- `README.md`
- `AGENTS.md` (this file)
- `docs/agent/OPERATING-MODEL.md`
- `docs/agent/RELEASE-STATE.md`
- `docs/agent/SWARM.md`

If docs disagree with implementation: prefer current impl for mechanics, prefer docs/spec for direction. Preserve compatibility. Report mismatches.

## Package Boundary Rules

| Package | Can depend on | Must not depend on |
|---------|---------------|-------------------|
| `@intent-framework/core` | nothing (zero runtime deps) | DOM, React, RN, Node, server frameworks, CSS, browser globals |
| `@intent-framework/dom` | `@intent-framework/core`, `@intent-framework/router` | React |
| `@intent-framework/router` | `@intent-framework/core` | nothing beyond core |
| `@intent-framework/server` | `@intent-framework/core` | Express, Fastify, Hono, etc. Prefer Web APIs. |
| `@intent-framework/testing` | `@intent-framework/core` | nothing beyond core |

Type safety is part of the product. Avoid `any`. Prefer `unknown`. Preserve literal inference.

## Validation Commands

```sh
rm -rf packages/*/dist examples/*/dist
pnpm test
pnpm typecheck
pnpm build
pnpm lint
pnpm pack:check
pnpm changeset status
```

All must pass before saying work is complete. CI runs the same clean-dist validation.

## Release Rules

See `docs/agent/RELEASE-STATE.md` for current versions, publish commands, workflow permissions, and serialization rules.

TL;DR: `pnpm release:alpha` publishes alpha. Release work is serialized, never parallelized.

## Swarm Coordination Rules

See `docs/agent/SWARM.md` for the full swarm model: dispatcher pattern, lane rules, allowed/forbidden files, merge policies, conflict rules, and report format.

## Allowed / Forbidden Agent Behavior

### Allowed
- Read any file in the repository
- Create branches, implement changes, write tests, update docs
- Run validation commands
- Open PRs and report results
- Merge docs/examples/tooling PRs when CI is green (no explicit approval needed)

### Forbidden
- Publish packages to npm or create dist-tags
- Merge runtime/API/release PRs without explicit `merge when green`
- Push directly to `main`
- Change package versions or add dependencies casually
- Create changesets unless repo policy requires one for the change
- Invent roadmap items or expand scope beyond the current task
- Bypass user review for runtime/API changes

## Follow User-Provided Plans Exactly

Execute the user's plan step by step. Do not deviate unless there is:
1. A concrete repo safety issue (e.g. the plan would delete files, publish prematurely, or merge breaking changes)
2. A file-scope conflict with another in-flight change
3. Ambiguity requiring clarification

When in doubt, stop and ask.

## Do Not Invent Roadmap

Do not suggest follow-up features, refactors, or architecture changes unless the user explicitly asks. Do not expand scope. Do not merge runtime or API work without user review.

## Final Reminder

Intent is a semantic application framework. The source code is intent. The DOM is output. API routes are transport. Native components are output. Protect the idea.
