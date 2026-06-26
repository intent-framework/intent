# Release State

## Current Versions

| Package | Version | Published | Notes |
|---------|---------|-----------|-------|
| `@intent-framework/core` | `0.1.0-alpha.1` | Yes | alpha prerelease |
| `@intent-framework/dom` | `0.1.0-alpha.2` | Yes | alpha prerelease |
| `@intent-framework/router` | `0.1.0-alpha.1` | Yes | alpha prerelease |
| `@intent-framework/testing` | `0.1.0-alpha.1` | Yes | alpha prerelease |
| `@intent-framework/server` | `0.1.0` | No | private workspace package |

`@intent-framework/server` must remain `"private": true`. Never publish it.

## Alpha Publish Command

```sh
pnpm release:alpha
```

Expands to:

```sh
pnpm build && pnpm pack:check && changeset publish --tag alpha
```

This builds, validates packing, then publishes with the `alpha` npm dist-tag.

## Workflow Permissions

The `publish-alpha.yml` workflow requires `contents: write` so git tags can be pushed.  
The workflow is triggered manually (`workflow_dispatch`) and runs in the `npm` environment.

## Serialization Rule

Release / version / publish work is **serialized, never parallelized**.

- Only one publish workflow runs at a time (`concurrency: ${{ github.workflow }}`)
- Do not run `changeset version` or `changeset publish` concurrently
- Do not merge version packages PRs simultaneously
- Wait for one release to complete before starting the next

## Prerelease Mode

Changesets are in alpha prerelease mode (`.changeset/pre.json`). This must stay until the team explicitly exits prerelease mode. Version Packages PRs must not bump packages to stable versions.

## Pack Check

```sh
pnpm pack:check
```

Dry-runs `npm pack` for the four publishable packages (core, dom, router, testing). Excludes the private server package. Requires no network access, produces no committed tarballs.

## Related

- `docs/Release-Readiness.md` — full release readiness audit and first-alpha checklist
- `.github/workflows/publish-alpha.yml` — manual publish workflow
- `.github/workflows/version-packages.yml` — automated version PR workflow
