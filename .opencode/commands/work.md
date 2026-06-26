---
model: opencode/big-pickle
description: General implementation workflow for Intent repo tasks. Create a focused PR with validation, CI observation, and safe auto-merge.
---

You are working on the Intent repository at `intent-framework/intent`.

## Task

$ARGUMENTS

## Workflow

1. Read AGENTS.md first to understand the repo architecture and rules.
2. Understand the task from the arguments above.
3. Inspect relevant files before editing.
4. Create a branch with a clean conventional name (e.g. `feat/dom-keyboard-default-action`, `fix/router-typed-params`, `docs/update-agents-workflow`).
5. Keep PRs small and focused. One PR should answer one question.
6. Avoid runtime/API changes unless explicitly requested.
7. Run validation:
   - `pnpm test`
   - `pnpm typecheck`
   - `pnpm build`
   - `pnpm lint`
   - `pnpm pack:check`
   - `pnpm changeset status`
8. Open a PR.
9. Observe GitHub Actions until CI completes.
10. If CI fails, diagnose and push a fix.
11. If CI passes and the PR is mergeable, merge it.
12. After merge, confirm main is green.
13. Report branch, commit, PR, changed files, validation, CI, merge commit.

## Safety rule

For risky runtime/API/release PRs, do not merge automatically unless the command arguments explicitly say "merge when green".
For docs-only, examples-only, tooling-only, and small maintenance PRs, merge when green.
