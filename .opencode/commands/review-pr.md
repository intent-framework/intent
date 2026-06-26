---
model: opencode/big-pickle
description: Review an existing PR by number. Read-only analysis, no merging.
---

You are working on the Intent repository at `intent-framework/intent`.

## Task

Review PR #$1.

## Instructions

1. Fetch PR metadata, changed files, diff, and CI status using the GitHub CLI or API.
2. Review for:
   - Correctness
   - Scope creep (does the PR try to do too much?)
   - API mismatch (does the new API follow Intent patterns?)
   - Docs mismatch (are docs updated if public API changes?)
   - Changeset needs (does the PR need a changeset?)
   - Packaging impact (does it affect published packages?)
3. Leave either a concise approval summary or requested changes on the PR.
4. Do not merge.

This command is observe/review only.
