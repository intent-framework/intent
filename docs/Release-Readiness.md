# Intent Release Readiness

## Status

Intent is in early experimental development. No packages have been published to npm. No GitHub Releases have been created.

The repository has five workspace packages under `packages/*`, all at version `0.1.0`, all using `workspace:*` dependency references. The codebase is functional and validated by CI, but several metadata and workflow steps are missing before a first alpha release.

## Intended publishable packages

All five packages under `packages/*` are intended to be published:

| Package | npm name | Purpose |
|---|---|---|
| `packages/core` | `@intent/core` | Platformless semantic graph and runtime |
| `packages/dom` | `@intent/dom` | DOM materializer for screens and router |
| `packages/router` | `@intent/router` | Typed route definitions and navigation |
| `packages/testing` | `@intent/testing` | Semantic test harness |
| `packages/server` | `@intent/server` | Early server-side package |

Packages under `examples/` (e.g., `web-basic`) are private and must not be published.

## Package audit

### `@intent/core`

| Field | Value | Status |
|---|---|---|
| Current version | `0.1.0` | Acceptable for alpha |
| `main` | `./dist/index.js` | Exists after build |
| `module` | `./dist/index.js` | Exists after build |
| `types` | `./dist/index.d.ts` | Exists after build |
| `exports` | `{ ".": { types, import, default } }` | Correct |
| `files` | `["dist"]` | Correct — only `dist/` and `package.json` included in tarball |
| `description` | Present | Added in this audit |
| `license` | MIT field present | Root LICENSE file present |
| `repository` | Missing | Recommended for npm listing |
| `engines` | Missing | Should document minimum Node version |
| `dependencies` | None | Good — core is platformless |
| Build tool | `tsdown` | Bundles ESM + `.d.ts` |
| Test harness | `vitest` | Tests pass |

### `@intent/dom`

| Field | Value | Status |
|---|---|---|
| Current version | `0.1.0` | Acceptable for alpha |
| `main` | `./dist/index.js` | Exists after build |
| `module` | `./dist/index.js` | Exists after build |
| `types` | `./dist/index.d.ts` | Exists after build |
| `exports` | `{ ".": { types, import, default } }` | Correct |
| `files` | `["dist"]` | Correct |
| `description` | Present | Added in this audit |
| `license` | MIT field present | Root LICENSE file present |
| `repository` | Missing | Recommended |
| `dependencies` | `@intent/core`, `@intent/router` | Uses `workspace:*` — correct for monorepo |
| Build tool | `tsdown` | Bundles ESM + `.d.ts` |

### `@intent/router`

| Field | Value | Status |
|---|---|---|
| Current version | `0.1.0` | Acceptable for alpha |
| `main` | `./dist/index.js` | Exists after build |
| `module` | `./dist/index.js` | Exists after build |
| `types` | `./dist/index.d.ts` | Exists after build |
| `exports` | `{ ".": { types, import, default } }` | Correct |
| `files` | `["dist"]` | Correct |
| `description` | Present | Added in this audit |
| `license` | MIT field present | Root LICENSE file present |
| `repository` | Missing | Recommended |
| `dependencies` | `@intent/core` | Uses `workspace:*` |
| Build tool | `tsdown` | Bundles ESM + `.d.ts` |

### `@intent/testing`

| Field | Value | Status |
|---|---|---|
| Current version | `0.1.0` | Acceptable for alpha |
| `main` | `./dist/index.js` | Exists after build |
| `module` | `./dist/index.js` | Exists after build |
| `types` | `./dist/index.d.ts` | Exists after build |
| `exports` | `{ ".": { types, import, default } }` | Correct |
| `files` | `["dist"]` | Correct |
| `description` | Present | Added in this audit |
| `license` | MIT field present | Root LICENSE file present |
| `repository` | Missing | Recommended |
| `dependencies` | `@intent/core` | Uses `workspace:*` |
| Build tool | `tsdown` | Bundles ESM + `.d.ts` |

### `@intent/server`

| Field | Value | Status |
|---|---|---|
| Current version | `0.1.0` | Acceptable for alpha |
| `main` | `./dist/index.js` | Exists after build |
| `module` | `./dist/index.js` | Exists after build |
| `types` | `./dist/index.d.ts` | Exists after build |
| `exports` | `{ ".": { types, import, default } }` | Correct |
| `files` | `["dist"]` | Correct |
| `description` | Present | Added in this audit |
| `license` | MIT field present | Root LICENSE file present |
| `repository` | Missing | Recommended |
| `dependencies` | `@intent/core` | Uses `workspace:*` |
| Build tool | `tsdown` | Bundles ESM + `.d.ts` |
| Note | Early stage | Server package has global registries and basic action/resource/policy types. Not yet production-ready. |

## Package naming and npm scope risk

All five packages use the `@intent/*` npm scope.

**Before publishing, confirm ownership or availability of the `@intent` npm organization/scope.**

If `@intent` is unavailable, choose a different public scope (e.g., `@intent-framework/*`, `@intentjs/*`, or another unique name) before first release. Changing the scope after publishing is disruptive.

Current package names:

- `@intent/core`
- `@intent/dom`
- `@intent/router`
- `@intent/testing`
- `@intent/server`

These names are descriptive and low-risk if the `@intent` scope is available. Scope availability has not been verified.

## Build outputs

All packages use `tsdown` with the same configuration:

```ts
defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  dts: true,
  clean: true,
})
```

This produces:
- `dist/index.js` — ESM bundle
- `dist/index.d.ts` — bundled type declarations
- Individual `.d.ts` files for each module (tsdown re-exports)

Build outputs exist and are correct after running `pnpm build`.

## Export maps

All packages expose a single entry point `"."` with three conditions:

```json
{
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "default": "./dist/index.js"
  }
}
```

This is correct for ESM-only packages. No package currently exposes sub-path exports (e.g., `@intent/core/internal`), which is fine for alpha.

## Type declarations

All packages produce `dist/index.d.ts` with correct type declarations.

The root `tsconfig.typecheck.json` maps `@intent/*` workspace packages to their source directories for type-checking without reading stale `dist/` output.

Package-level `tsconfig.json` files use `composite: true` (except `@intent/server`, which lacks it) and extend the root config.

## Files included in npm packages

The `files` field in every package is `["dist"]`. Based on `npm pack --dry-run` output:

| Package | Files in tarball | Size |
|---|---|---|
| `@intent/core` | 13 `dist/*` files + `package.json` (14 total) | 38.5 kB unpacked |
| `@intent/dom` | 4 `dist/*` files + `package.json` (4 total) | 10.9 kB unpacked |
| `@intent/router` | 3 `dist/*` files + `package.json` (4 total) | 6.5 kB unpacked |
| `@intent/testing` | 2 `dist/*` files + `package.json` (3 total) | 4.5 kB unpacked |
| `@intent/server` | 2 `dist/*` files + `package.json` (3 total) | 4.2 kB unpacked |

No unnecessary files (source maps, config files, tests, node_modules) leak into the tarball. The `files` policy is correct.

## Release workflow recommendation

### Use Changesets

[Changesets](https://github.com/changesets/changesets) is recommended for:

- Version bumping (independent versioning per package)
- Changelog generation per package
- Coordinated publishing across the workspace

### Recommended GitHub Action

Add a Changeset-based GitHub Action (e.g., `changesets/action`) that:

1. Runs on pushes to `main`
2. Opens or updates a "Version Packages" PR when changeset files are present
3. Publishes to npm when the version PR is merged

### Publish cadence

- Start with an **alpha release** (`0.1.0-alpha.0`)
- Use `Changesets` pre-release mode for alpha/beta
- Graduate to stable after API surface is settled and real-world usage begins

### Validation gates

Publishing should only happen after:

- CI passes with clean-dist validation
- `pnpm pack:check` passes
- At least one maintainer reviews the version PR

## GitHub Releases recommendation

Use GitHub Releases generated from Changesets release notes.

After a successful npm publish:

1. Changesets creates a GitHub Release with auto-generated notes
2. Tag the release with a semver version (e.g., `v0.1.0-alpha.0`)
3. Include the changelog summary in the release body

Do not manually create GitHub Releases.

## First alpha release checklist

- [ ] Confirm npm scope/package names (verify `@intent` org ownership)
- [ ] Reconfirm MIT is the intended public license before publishing
- [ ] Confirm package metadata (`repository` field in all packages)
- [ ] Confirm package exports (all point to correct `dist/` paths — already correct)
- [ ] Confirm package files (`files: ["dist"]` — already correct)
- [ ] Confirm declaration files (`dist/index.d.ts` exists — already correct)
- [ ] Run clean-dist validation (`rm -rf packages/*/dist examples/*/dist && pnpm test && pnpm typecheck && pnpm build && pnpm lint`)
- [ ] Run `pnpm pack:check`
- [ ] Add Changesets (`pnpm add -Dw @changesets/cli && pnpm changeset init`)
- [ ] Add release workflow (GitHub Action for Changesets)
- [ ] Publish first alpha (`pnpm changeset publish`)
- [ ] Create GitHub Release (automatic via Changesets, or manual)

## Current blockers

Before first alpha release, the following must be resolved:

1. **Missing `repository` fields** — Recommended for npm listing and source links.
2. **`@intent` npm scope availability** — Must be verified. If unavailable, a fallback scope must be chosen before first release.
3. **No release workflow** — Changesets and a GitHub Action must be added before publishing.
4. **Server package is very early** — `@intent/server` has global registries and minimal API surface. Consider whether to publish it or mark it as private until more mature.
5. **Version is `0.1.0` across all packages** — Consistent, but no pre-release tag (e.g., `0.1.0-alpha.0`) for the first publish.

## Do not do yet

- Do not publish any package to npm.
- Do not create a GitHub Release.
- Do not add Changesets yet — wait until the audit blockers are resolved.
- Do not add a release GitHub Action yet.
- Do not change package names, versions, or public APIs.
- Do not add new dependencies unless required for a specific task.

## Pack check command

This PR adds a root pack-check command:

```sh
pnpm pack:check
```

It dry-runs `npm pack` for all five workspace packages after build. It does not publish, does not require network access, and does not create committed tarballs.
