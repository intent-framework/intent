# Intent Release Readiness

## Status

Intent is in early experimental development. No packages have been published to npm. No GitHub Releases have been created.

The repository has five workspace packages under `packages/*`. The four publishable packages are at version `0.1.0-alpha.0`. The private server package remains at `0.1.0`. All use `workspace:*` dependency references. The codebase is functional and validated by CI. Changesets is installed and configured. Release workflows exist for automated version PRs and manual alpha publishing.

Four packages are intended for first-alpha publishing. `packages/server` is a private workspace package for now.

## Intended publishable packages

The first alpha will publish four packages:

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
| Current version | `0.1.0` | Acceptable for alpha |
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
| Current version | `0.1.0` | Acceptable for alpha |
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
| Current version | `0.1.0` | Acceptable for alpha |
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
| Current version | `0.1.0` | Acceptable for alpha |
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
| Current version | `0.1.0` | Acceptable for alpha |
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
| Publish? | No, private for first alpha | `"private": true` set; `publishConfig` removed |
| Note | Early stage | Server package has global registries and basic action/resource/policy types. Not yet production-ready. |

## Package naming

All packages use the `@intent-framework/*` npm scope.

The `intent-framework` npm organization has been created. The scope is:

- `@intent-framework/core`
- `@intent-framework/dom`
- `@intent-framework/router`
- `@intent-framework/testing`
- `@intent-framework/server` (private workspace package for first alpha)

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
- **Publish command**: `pnpm release:alpha` (builds, runs pack check, then `changeset publish --tag alpha`)
- **npm auth**: configured at runtime via `NODE_AUTH_TOKEN`; no committed `.npmrc` file
- Both workflows explicitly pin pnpm 10 via `pnpm/action-setup@v6` with `version: 10`

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
- [ ] NPM_TOKEN secret added to GitHub repository secrets
- [ ] Publish first alpha via manual Publish Alpha workflow
- [ ] Optionally create a GitHub Release manually after npm publish

## Current blockers

- repository fields: present
- GitHub repository home: `intent-framework/intent`
- Changesets: installed and configured
- Release workflows: version-packages.yml (automated version PRs) and publish-alpha.yml (manual publish) are added
- Remaining first-alpha blocker: add `NPM_TOKEN` secret, then manually run Publish Alpha

## Future server-package decisions

- Server maturity is no longer a first-alpha publishing blocker because server is private
- When the server API matures, the package can be made public and published as a separate decision

## Do not do yet

- Do not publish any package to npm until the manual Publish Alpha workflow is triggered.
- Do not create a GitHub Release yet. The current manual Publish Alpha workflow publishes npm packages only. GitHub Releases are not automated yet.
- Do not change runtime or public APIs.
- Do not add new dependencies unless required for a specific task.

## Required secret: NPM_TOKEN

Before running the Publish Alpha workflow, a GitHub Actions secret must be added:

| Secret | Purpose |
|---|---|
| `NPM_TOKEN` | npm access token with publish permission for `@intent-framework/*` packages |

The token must:
- Have **publish** permission for the `@intent-framework` npm organization
- Be stored as a GitHub Actions secret (not in the repository)
- Be configured in the `npm` GitHub environment used by the Publish Alpha workflow

Do not commit the token value to the repository.

### Future improvement: trusted publishing

Migrate npm publishing to trusted publishing / OIDC once the initial package publishing flow is stable.

## Pack check command

The root `pack:check` command:

```sh
pnpm pack:check
```

dry-runs `npm pack` for the four publishable workspace packages (core, dom, router, testing). It excludes the private `@intent-framework/server` package. It does not publish, does not require network access, and does not create committed tarballs.
