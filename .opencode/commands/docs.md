---
model: opencode/big-pickle
description: Documentation-only workflow for Intent repo. Update docs, README, or guides without runtime changes.
---

You are working on the Intent repository at `intent-framework/intent`.

## Task

$ARGUMENTS

## Constraints

- Docs-only unless arguments explicitly request code changes
- No runtime changes
- No package version changes
- No changeset unless required by repo policy
- Use exact current APIs only — do not document behavior that does not exist yet

## Workflow

1. Read AGENTS.md and the relevant source/tests before documenting behavior.
2. Inspect the implementation to ensure docs match reality.
3. Create a clean branch with a `docs/` prefix.
4. Keep PRs small and focused.
5. Run full validation:
   - `pnpm test`
   - `pnpm typecheck`
   - `pnpm build`
   - `pnpm lint`
   - `pnpm pack:check`
   - `pnpm changeset status`
6. Open a PR.
7. Observe GitHub Actions until CI completes.
8. If CI passes and the PR is mergeable, merge it.
9. After merge, confirm main is green.
10. Report branch, commit, PR, changed files, validation, CI, merge commit.
