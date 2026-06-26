# Swarm Coordination

## Dispatcher Pattern

When a user provides a plan that contains multiple independent work items:

1. Big Pickle (the dispatcher) analyzes the plan and identifies scoped tasks
2. Each task must have non-overlapping file scope (see Lane Rules)
3. The dispatcher creates a GitHub issue per task with a clear description
4. The dispatcher posts `/oc` worker comments on each issue to trigger OpenCode workers
5. Workers execute independently and report results as PRs
6. The dispatcher observes all PRs, tracks CI, and reports the combined status

The dispatcher does **not** implement work itself. Its job is to decompose, issue, and coordinate.

## Lane Rules

A lane is a stream of work with non-overlapping file scope. Lanes are defined by the **family** of files they touch:

| Lane | File family | Examples |
|------|-------------|----------|
| `runtime/core` | `packages/core/src/**`, `packages/core/test/**` | Core API changes |
| `renderer/dom` | `packages/dom/src/**`, `packages/dom/test/**` | DOM renderer changes |
| `renderer/router` | `packages/router/src/**`, `packages/router/test/**` | Router changes |
| `renderer/testing` | `packages/testing/src/**`, `packages/testing/test/**` | Testing harness changes |
| `renderer/server` | `packages/server/src/**`, `packages/server/test/**` | Server changes |
| `example/web-basic` | `examples/web-basic/**` | Web basic example |
| `example/canonical` | `examples/canonical-invite/**` | Canonical invite example |
| `docs` | `docs/**`, `README.md`, `AGENTS.md` | Documentation |
| `tooling` | `.github/**`, `.opencode/**`, `package.json`, `pnpm-workspace.yaml`, `tsconfig*.json` | CI, commands, config |

### Lane Design Guidelines

- **Prefer exact allowed file paths for parallel lanes.** Broad families like `docs/**` create scope overlap. When multiple docs tasks exist, scope each lane to an exact sub-path (e.g. `docs/agent/` vs `docs/guide/`).
- **Broad families should be serialized.** If a lane uses a broad family like `docs/**`, it should be the only lane in that family running in a given cycle. Run broad lanes one at a time.

## Allowed / Forbidden Files

### Allowed
- Any file within the assigned lane's file family
- Cross-lane reads are allowed (e.g. a core task can read DOM files for context)
- Shared config files if the change is incidental and scoped to the lane's concern

### Forbidden
- No two lanes may modify overlapping file families simultaneously
- A docs lane must not edit `packages/*/src/**`
- A core lane must not edit `examples/**` or `.github/**` unless the task explicitly requires it
- No lane may change package versions unless it is a release lane
- Unexpected changesets in docs-only lanes are scope violations unless the task explicitly allows them

## Merge Policies

| PR type | Merge policy |
|---------|-------------|
| Docs-only | Auto-merge when CI is green |
| Examples-only | Auto-merge when CI is green |
| Tooling/commands | Auto-merge when CI is green |
| Small maintenance | Auto-merge when CI is green |
| Runtime/API changes | Require explicit user approval (`merge when green`) |
| Release/version | Require explicit user approval |

### No auto-merge for runtime/API changes

This applies to any PR that modifies `packages/*/src/**` beyond trivial comments or test-only changes. Runtime/API PRs must be reviewed and approved by the user before merge.

### Merge one PR at a time

Even when auto-merge is allowed, merge sequentially. Wait for one PR to merge and observe CI on main before merging the next. This avoids cascading failures and tangled rollbacks.

### Operational Notes

- **Maintainer workflow approval may be required.** On first interaction with a repository, GitHub Actions may pause until a maintainer approves the run. This is not a failure state.
- **Verify actual changed files, not PR descriptions.** PR descriptions can become stale or inaccurate. Before merging, confirm file scope via `git diff` against the base branch.
- **Stale PR bodies are not blockers.** If the PR body is outdated but the actual changed files and CI are correct, proceed with the merge. The PR body is documentation, not source of truth.

## Conflict Rules

- If two active PRs touch the same file family, flag them as conflicting
- Do not start new work in a lane that has an open PR
- If conflicts arise, pause the later PR and ask for direction
- Do not force-merge conflicting PRs

## Report Format

Every swarm PR report should include:

```txt
Task:
Lane:
Branch:
PR:
Files changed:
Summary:
CI status:
Blockers:
Merge order (if multiple PRs):
```

## No Overlapping File Families

This is enforced by the dispatcher at task creation time. If the user's plan contains tasks that would touch the same file family, the dispatcher must:

1. Warn about the overlap
2. Suggest sequencing the tasks instead of parallelizing
3. Not create parallel issues for overlapping lanes

## Special: Release Work

Release work (version bumps, publish, dist-tags) is always serialized and never dispatched as parallel swarm work. See `docs/agent/RELEASE-STATE.md`.
