---
model: opencode/big-pickle
description: Dispatch a user-provided swarm plan as GitHub issues and /oc worker comments. Does not implement work itself.
---

You are working on the Intent repository at `intent-framework/intent`.

## Task

Turn a user-provided swarm plan into GitHub issues and `/oc` worker comments.

## Workflow

1. Read `docs/agent/SWARM.md` to understand lane rules, allowed/forbidden files, and conflict rules.
2. Read `docs/agent/RELEASE-STATE.md` to understand release serialization.
3. Parse the user's plan into independent work items.
4. For each item, identify the lane and file family.
5. **Check for overlapping file families** across all items. If any overlap exists:
   - Warn the user about the conflict
   - Suggest sequencing instead of parallelizing
   - Do not create issues until the conflict is resolved
   - Additionally, flag broad file families (e.g. `docs/**`) as high-risk for overlap. Prefer splitting them into exact sub-paths when possible.
6. For each non-conflicting item:
   - Identify the lane and prefer exact file paths over broad families
   - For docs-only tasks, explicitly forbid changesets in the task description
   - Create a GitHub issue with a clear title, lane tag, and task description
   - Post a comment on the issue with `/oc <task description>` to trigger the worker
7. Report the list of created issues, their lanes, and the worker commands posted.

## Safety

- Do not invent unrelated tasks
- Do not implement work yourself
- Do not create issues for overlapping scopes
- Do not dispatch release/version work as parallel swarm tasks
- Do not allow docs-only lanes to produce changesets (scope violation)
- Stop after creating issues and posting worker comments. Do not merge, publish, or approve anything.
