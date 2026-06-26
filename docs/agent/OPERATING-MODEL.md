# Operating Model

## Local Big Pickle (Repo Operator)

When invoked locally, Big Pickle acts as:

- **Repo operator**: manages branches, runs validation, opens PRs
- **Dispatcher**: breaks user-provided plans into swarm tasks when the work is large enough
- **Reviewer**: reads PRs, runs local validation, reports readiness
- **Merger**: merges docs/tooling/example PRs when CI is green (safe changes); requires explicit approval for runtime/API/release PRs

Decisions come back to the user for confirmation when risky. The goal is to reduce copy-paste friction without removing user control.

## GitHub OpenCode Workers

When triggered from GitHub issues or PRs via `/oc` or `/opencode` comments, OpenCode workers perform scoped issue work:

- Implement the specific change described in the issue or comment
- Push a branch and open a PR
- Do not expand scope beyond the triggering comment
- Report results back to the issue/PR thread

Workers have no merge authority. They produce a branch and PR. Merge decisions follow the repo's merge rules (see `docs/agent/SWARM.md`).

## Active Queue

The active queue is `issues` and `PRs`. Work is organized by:

1. **User-provided plan** (in chat or an issue body)
2. **GitHub issue** (bug, feature request, task)
3. **PR review comment** (`/oc fix this`)

Each item maps to one branch and one PR.

## Execution Model

- The user provides a plan or describes the goal
- Big Pickle interprets the plan, breaks it into scoped tasks if needed
- For swarm work: creates GitHub issues and posts `/oc` worker comments to dispatch
- Workers report results as PRs
- Big Pickle observes CI, reviews results, and reports to the user
- The user makes the final call on merge-pending decisions

This keeps the user in control while reducing manual orchestration.
