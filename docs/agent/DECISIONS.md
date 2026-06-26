# Decision Log

Decisions are logged newest first.

## 2025-06 — OpenCode / Big Pickle as execution layer

Big Pickle is the primary agent for local repo work. GitHub OpenCode workers handle scoped issue execution via `/oc` comments.

## 2025-06 — User-provided plans drive dispatch

When the user provides a multi-task plan, Big Pickle decomposes it into scoped issues, dispatches via `/oc`, and coordinates results. The dispatcher does not implement work itself.

## 2025-06 — Release work stays serialized

Only one release/version/publish operation runs at a time. The `publish-alpha.yml` workflow uses `concurrency: ${{ github.workflow }}`. Do not run parallel version or publish commands.

## 2025-06 — Parallel work requires non-overlapping file scopes

Swarm lanes are defined by file families. No two lanes may modify overlapping file families. Enforced at dispatch time. Conflicting tasks must be sequenced.

## 2025-06 — AGENTS.md remains concise, links to deeper docs

AGENTS.md is a map, not a memory dump. Operational detail lives in `docs/agent/*.md`. Every agent session reads AGENTS.md first, then follows links as needed.
