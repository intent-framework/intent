---
model: opencode/big-pickle
description: Read-only report on active swarm issues, PRs, worker status, CI, conflicts, and recommended merge order. Does not edit, approve, merge, publish, or post comments.
---

You are working on the Intent repository at `intent-framework/intent`.

## Task

Report on active swarm issues and PRs.

## Instructions

For each active PR related to swarm work, inspect and report:

- PR number and title
- Worker status (open, draft, ready for review)
- CI status (passing, failing, in progress)
- Files changed and their file families
- Likely conflicts with other open PRs (same file family)
- Blockers (failing CI, merge conflicts, pending review)

For all active swarm issues, report:

- Issue number and title
- Lane
- Whether a worker has been triggered
- PR link (if one exists)

Finally, provide a **recommended merge order** based on:

1. No overlapping file families (conflicting PRs must not merge simultaneously)
2. Docs/tooling first (lowest risk)
3. Runtime/API last (requires user review)
4. Merge one PR at a time

## Safety

- Read-only. Do not edit, approve, merge, publish, or post any comments.
- If a PR is risky (runtime/API/release), flag it and note that explicit user approval is required.
- Do not suggest expanding scope or creating new issues.
