# Intent Release Readiness

## Status

Three public alpha releases have been published: `0.1.0-alpha.0`, `0.1.0-alpha.1`, and `0.1.0-alpha.2`.

Five packages are under the `@intent-framework/*` scope, four of which are published to npm. The server package `@intent-framework/server` remains private and unpublished.

Changesets is installed and configured. Release workflows exist for automated version PRs and manual alpha publishing.

## Published packages

The following packages are published to npm:

| Package | npm name | Purpose |
|---|---|---|
| `packages/core` | `@intent-framework/core` | Platformless semantic graph and runtime |
| `packages/dom` | `@intent-framework/dom` | DOM materializer for screens and router |
| `packages/router` | `@intent-framework/router` | Typed route definitions and navigation |
| `packages/testing` | `@intent-framework/testing` | Semantic test harness |

`packages/server` remains a private workspace package until the server API matures.

Packages under `examples/` (e.g., `web-basic`) are private and must not be published.

## Package audit

### `@intent-framework/core`

| Field | Value | Status |
|---|---|---|
| Current version | `0.1.0-alpha.1` | Acceptable for alpha |
| `main` | `./dist/index.js` | Exists after build |
| `module` | `./dist/index.js` | Exists after build |
| `types` | `./dist/index.d.ts` | Exists after build |
| `exports` | `{ ".": { types, import, default } }` | Correct |
| `files` | `["dist"]` | Correct — only `dist/` and `package.json` included in tarball |
| `description` | Present | Added in this audit |
| `license` | MIT field present | Root LICENSE file present |
| `repository` | Present | Points to `intent-framework/intent` (`packages/core`) |
| `engines` | Missing | Should document minimum Node version |
| `dependencies` | None | Good — core is platformless |
| Build tool | `tsdown` | Bundles ESM + `.d.ts` |
| Test harness | `vitest` | Tests pass |

### `@intent-framework/dom`

| Field | Value | Status |
|---|---|---|
| Current version | `0.1.0-alpha.2` | Acceptable for alpha |
| `main` | `./dist/index.js` | Exists after build |
| `module` | `./dist/index.js` | Exists after build |
| `types` | `./dist/index.d.ts` | Exists after build |
| `exports` | `{ ".": { types, import, default } }` | Correct |
| `files` | `["dist"]` | Correct |
| `description` | Present | Added in this audit |
| `license` | MIT field present | Root LICENSE file present |
| `repository` | Present | Points to `intent-framework/intent` (`packages/dom`) |
| `dependencies` | `@intent-framework/core`, `@intent-framework/router` | Uses `workspace:*` — correct for monorepo |
| Build tool | `tsdown` | Bundles ESM + `.d.ts` |

### `@intent-framework/router`

| Field | Value | Status |
|---|---|---|
| Current version | `0.1.0-alpha.1` | Acceptable for alpha |
| `main` | `./dist/index.js` | Exists after build |
| `module` | `./dist/index.js` | Exists after build |
| `types` | `./dist/index.d.ts` | Exists after build |
| `exports` | `{ ".": { types, import, default } }` | Correct |
| `files` | `["dist"]` | Correct |
| `description` | Present | Added in this audit |
| `license` | MIT field present | Root LICENSE file present |
| `repository` | Present | Points to `intent-framework/intent` (`packages/router`) |
| `dependencies` | `@intent-framework/core` | Uses `workspace:*` |
| Build tool | `tsdown` | Bundles ESM + `.d.ts` |

### `@intent-framework/testing`

| Field | Value | Status |
|---|---|---|
| Current version | `0.1.0-alpha.1` | Acceptable for alpha |
| `main` | `./dist/index.js` | Exists after build |
| `module` | `./dist/index.js` | Exists after build |
| `types` | `./dist/index.d.ts` | Exists after build |
| `exports` | `{ ".": { types, import, default } }` | Correct |
| `files` | `["dist"]` | Correct |
| `description` | Present | Added in this audit |
| `license` | MIT field present | Root LICENSE file present |
| `repository` | Present | Points to `intent-framework/intent` (`packages/testing`) |
| `dependencies` | `@intent-framework/core` | Uses `workspace:*` |
| Build tool | `tsdown` | Bundles ESM + `.d.ts` |

### `@intent-framework/server`

| Field | Value | Status |
|---|---|---|
| Current version | `0.1.0` | Acceptable for alpha (private) |
| `main` | `./dist/index.js` | Exists after build |
| `module` | `./dist/index.js` | Exists after build |
| `types` | `./dist/index.d.ts` | Exists after build |
| `exports` | `{ ".": { types, import, default } }` | Correct |
| `files` | `["dist"]` | Correct |
| `description` | Present | Added in this audit |
| `license` | MIT field present | Root LICENSE file present |
| `repository` | Present | Points to `intent-framework/intent` (`packages/server`) |
| `dependencies` | `@intent-framework/core` | Uses `workspace:*` |
| Build tool | `tsdown` | Bundles ESM + `.d.ts` |
| Publish? | No, stays private | `"private": true` set; `publishConfig` removed |
| Note | Early stage | Server package has global registries and basic action/resource/policy types. Not yet production-ready. |

## Package naming

All packages use the `@intent-framework/*` npm scope.

The `intent-framework` npm organization has been created. The scope is:

- `@intent-framework/core`
- `@intent-framework/dom`
- `@intent-framework/router`
- `@intent-framework/testing`
- `@intent-framework/server` (private workspace package, not published)

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

This is correct for ESM-only packages. No package currently exposes sub-path exports (e.g., `@intent-framework/core/internal`), which is fine for alpha.

## Type declarations

All packages produce `dist/index.d.ts` with correct type declarations.

The root `tsconfig.typecheck.json` maps `@intent-framework/*` workspace packages to their source directories for type-checking without reading stale `dist/` output.

Package-level `tsconfig.json` files use `composite: true` (except `@intent-framework/server`, which lacks it) and extend the root config.

## Files included in npm packages

The `files` field in every package is `["dist"]`. Based on `npm pack --dry-run` output (pack:check now checks only publishable packages):

| Package | Files in tarball | Size |
|---|---|---|
| `@intent-framework/core` | 13 `dist/*` files + `package.json` (14 total) | 38.5 kB unpacked |
| `@intent-framework/dom` | 4 `dist/*` files + `package.json` (4 total) | 10.9 kB unpacked |
| `@intent-framework/router` | 3 `dist/*` files + `package.json` (4 total) | 6.5 kB unpacked |
| `@intent-framework/testing` | 2 `dist/*` files + `package.json` (3 total) | 4.5 kB unpacked |
| `@intent-framework/server` | 2 `dist/*` files + `package.json` (3 total) | 4.2 kB unpacked — not checked by pack:check since it is private |

No unnecessary files (source maps, config files, tests, node_modules) leak into the tarball. The `files` policy is correct.

## Release workflows

### Version Packages PR workflow

A Changesets-based [version-packages.yml](../.github/workflows/version-packages.yml) workflow runs on pushes to `main`:

1. Checks out the repository
2. Installs dependencies
3. Runs `pnpm version:packages` via `changesets/action`
4. Opens or updates a "Version Packages" PR when changeset files are present

This workflow does **not** publish to npm. It only manages the version PR.

### Manual Publish Alpha workflow

A [publish-alpha.yml](../.github/workflows/publish-alpha.yml) workflow exists for publishing:

- **Trigger**: manual only (`workflow_dispatch`)
- **Environment**: requires the `npm` GitHub environment
- **Pre-publish validation**: test, typecheck, build, lint, pack:check
- **Publish command**: `pnpm release:alpha` (builds, runs pack check, then `changeset publish`)
- **npm auth**: configured at runtime via `NODE_AUTH_TOKEN`; no committed `.npmrc` file
- Both workflows explicitly pin pnpm 10 via `pnpm/action-setup@v6` with `version: 10`

### Publish cadence

- Currently publishing **alpha releases** (`0.1.0-alpha.0` through `0.1.0-alpha.2` so far)
- Use `Changesets` pre-release mode for alpha/beta
- Graduate to stable after API surface is settled and real-world usage begins

### Prerelease mode requirement

Changesets must remain in alpha prerelease mode for the duration of the alpha phase. This is controlled by the `.changeset/pre.json` file, which is created by running:

```sh
pnpm changeset pre enter alpha
```

Key rules:

  - During alpha, Changesets must stay in alpha prerelease mode.
  - Version Packages PRs must not bump packages to stable versions.
  - Stable versions are only allowed after intentionally exiting prerelease mode via `pnpm changeset pre exit`.
  - The GitHub Actions PR creation setting (`GITHUB_TOKEN` permissions for creating and approving PRs) may need manual enabling after alpha versioning is fixed.
  - While in prerelease mode, the `alpha` npm dist-tag is controlled by `.changeset/pre.json` (the `"tag": "alpha"` field), not by the `release:alpha` command line.
  - `release:alpha` must NOT pass `--tag alpha` to `changeset publish` because changeset rejects explicit `--tag` in prerelease mode.

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

## Alpha release checklist

- [x] npm scope is `@intent-framework/*` — `intent-framework` org created, packages renamed
- [x] MIT confirmed as intended public license
- [x] Confirm package metadata (`repository` field in all packages)
- [x] Server is private — not a publishing blocker
- [x] Confirm package exports (all point to correct `dist/` paths)
- [x] Confirm package files (`files: ["dist"]`)
- [x] Confirm declaration files (`dist/index.d.ts` exists)
- [x] Clean-dist validation passes
- [x] Changesets installed and configured
- [x] Release workflows added:
  - Version Packages PR workflow (push-to-main)
  - Manual Publish Alpha workflow (manual dispatch only)
- [x] NPM_TOKEN secret added to GitHub repository secrets
- [x] First alpha published (v0.1.0-alpha.0)
- [x] Subsequent alpha releases published (v0.1.0-alpha.1, v0.1.0-alpha.2)

## Post-release verification

Published packages (latest alpha):

- `@intent-framework/core@0.1.0-alpha.1`
- `@intent-framework/dom@0.1.0-alpha.2`
- `@intent-framework/router@0.1.0-alpha.1`
- `@intent-framework/testing@0.1.0-alpha.1`

Verified:

- npm install smoke test passed for alpha.0, alpha.1, alpha.2
- `alpha` dist-tag points to the latest published alpha version
- `latest` dist-tag points to the latest alpha because no stable releases exist yet

When stable releases exist, `latest` should point to stable releases and `alpha` should point to prereleases.

## Server package

`@intent-framework/server` remains a private workspace package until the server API matures. When the server API matures, the package can be made public and published as a separate decision.

## NPM_TOKEN

`NPM_TOKEN` is required for manual publishing. Prefer environment-scoped GitHub secret under the `npm` environment. Use least privilege.

Future improvement: migrate npm publishing to trusted publishing / OIDC once the initial package publishing flow is stable.

## Pack check command

The root `pack:check` command:

```sh
pnpm pack:check
```

dry-runs `npm pack` for the four publishable workspace packages (core, dom, router, testing). It excludes the private `@intent-framework/server` package. It does not publish, does not require network access, and does not create committed tarballs.
