# OpenCode Workflow Commands

Project-level OpenCode commands and custom tools for the Intent repository.

## Prerequisites

- [OpenCode](https://opencode.ai) with the `opencode/big-pickle` model
- GitHub CLI (`gh`) authenticated for PR-related commands

## Commands

All commands use the `opencode/big-pickle` model.

| Command | Description |
|---------|-------------|
| `/work <task>` | General implementation workflow. Creates a branch, implements, validates, PRs, observes CI, merges when green. |
| `/docs <task>` | Documentation-only changes. No runtime/API changes, no version bumps, exact current APIs only. |
| `/review-pr <number>` | Read-only PR review. Checks correctness, scope, API fit, docs, changesets, packaging. Does not merge. |
| `/observe-pr <number>` | Watch PR CI, merge when green. Skips risky changes without explicit approval. |
| `/fix-ci <number>` | Diagnose and fix a failing CI run on a PR. Pushes minimal fix, re-observes CI, merges when safe. |
| `/release-check` | Inspect release readiness: versions, changeset status, pack:check, workflows. Never publishes automatically. |

## Usage examples

```
/work add package-level readmes
/docs add package docs
/review-pr 58
/observe-pr 58
/fix-ci 58
/release-check
```

## Merge rules

- **Docs/examples/tooling PRs**: auto-merge when CI is green
- **Risky runtime/API/release PRs**: require explicit `merge when green` in arguments

## Custom tools

| Tool | Description |
|------|-------------|
| `repo-status` | Read-only repo status: branch, HEAD, working tree, commits, scripts |
| `pr-status` | Read-only PR status via `gh` CLI: state, mergeability, checks |
| `validation` | Run validation commands: `full` (all 6), or scoped (`test`, `typecheck`, `build`, `lint`, `pack`, `changeset`) |

All custom tools are read-only except `validation`, which runs local build/check commands.
No tool deletes, resets, force-pushes, publishes, or reads secrets.
