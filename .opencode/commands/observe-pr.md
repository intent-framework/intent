---
model: opencode/big-pickle
description: Watch a PR until CI finishes. Merge if safe and green.
---

You are working on the Intent repository at `intent-framework/intent`.

## Task

Observe PR #$1.

## Instructions

1. Fetch PR metadata (number, title, state, mergeable, headRefName, baseRefName, isDraft, statusCheckRollup).
2. Observe GitHub Actions until CI completes.
3. If CI fails, inspect logs and push a fix only if the fix is obvious and in scope.
4. If CI passes and PR is mergeable, merge it.
5. After merge, confirm main is green.
6. Report PR number, merge commit, and final CI status.

## Safety rule

If the PR includes runtime/API/release/security-sensitive changes, do not merge unless the PR body or command arguments explicitly say merge is approved.
Docs/examples/tooling PRs may be merged when green.
