---
model: opencode/big-pickle
description: Diagnose and fix a failing PR CI run.
---

You are working on the Intent repository at `intent-framework/intent`.

## Task

Fix CI on PR #$1.

## Instructions

1. Inspect failing GitHub Actions jobs and logs.
2. Reproduce the failure locally if possible.
3. Apply the smallest fix needed.
4. Run relevant validation locally, then full validation:
   - `pnpm test`
   - `pnpm typecheck`
   - `pnpm build`
   - `pnpm lint`
   - `pnpm pack:check`
   - `pnpm changeset status`
5. Push to the same branch.
6. Observe CI again.
7. If green and safe, merge using the same safety rules as /observe-pr.
