---
title: Build, Archive & Release
outline: deep
---

# Build, Archive & Release

Going from a dev server to a zip a store will accept.

## `amber build`

```sh
amber build
```

Produces a self-contained extension in `dist/` with no dev-server dependency.
`NODE_ENV` defaults to `production`, and `dist/` is cleared first so stale files
from a previous build cannot leak into your package.

| Flag | Default | Effect |
| --- | --- | --- |
| `-p`, `--prod`, `--production` | off | Production build — implies minification. |
| `-m`, `--minify` | off | Minify without the other production behaviour. |
| `-c`, `--clean` | **on** | Remove `dist/` before building. |
| `-s`, `--sourcemap [mode]` | off | Emit source maps. Pass `hidden` to omit the comment linking to them. |
| `-w`, `--watch` | off | Rebuild on change, without a dev server. |

The build runs in two passes: one bundling every ES-format entrypoint together
so shared code lands in `shared/`, then one pass per `iife` content script,
since those cannot participate in code splitting.

> [!IMPORTANT]
> Never publish a `dist/` produced by `amber dev`. A development build loads
> code from `localhost` and carries extra permissions and injected reload
> plumbing. Always run `amber build` before packaging.

## `amber archive`

```sh
amber archive
```

Zips `dist/` into `release/`. The filename defaults to
`[name]-[version].[format]`, filled from your `package.json`:

```plain
release/my-extension-1.0.0.zip
```

Pass a name to override the pattern. `[name]`, `[version]`, and `[format]` are
substituted:

```sh
amber archive "[name]-chrome-[version].[format]"
```

| Flag | Default | Effect |
| --- | --- | --- |
| `--outDir <path>` | `release` | Output folder. |
| `--level <level>` | `9` | Accepted, but **currently has no effect** — the archive is written with the zip library's defaults. |

`archive` zips whatever is in `dist/` at that moment. It does not build first —
run `amber build` yourself, in that order.

## Source maps

Store review does not require source maps, and shipping them publicly exposes
your original source. The usual arrangement is to build them, upload them to
your error reporter, and keep them out of the zip:

```sh
amber build --prod --sourcemap hidden
```

`hidden` emits the `.map` files without adding the `//# sourceMappingURL`
comment, so browsers ignore them but your reporter can still symbolicate. See
[Error Reporting with Sentry](./sentry) for the upload step.

## Versioning

Chrome requires a dotted-integer version and rejects semver pre-release tags, so
`1.2.0-beta.3` is not a valid extension version. The
[`version` helper](../building/config#version-numbers) converts it while keeping
the readable original in `version_name`.

Keep `package.json` as the single source of truth — `archive` reads the version
from there for the filename, so a mismatch produces confusingly named zips.

## Releasing from GitHub Actions

A minimal workflow that builds, archives, and attaches the zip to a tagged
release:

```yaml [.github/workflows/release.yml]
name: Release

on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - run: bun install --frozen-lockfile

      - run: bun run build

      - run: bun run archive

      - uses: softprops/action-gh-release@v2
        with:
          files: release/*.zip
```

`bun run build` and `bun run archive` are the scaffolder's scripts, which call
`amber build` and `amber archive`. Swap in npm or pnpm if that's your package
manager.

If you build with `--sourcemap`, add the upload step for your error reporter
*before* the release step, so maps are uploaded even if publishing fails.

## Publishing to the Chrome Web Store

The zip from `amber archive` is what you upload. Before the first submission,
make sure your manifest carries what review requires:

- `description` — Amber requires it too, so this is already satisfied.
- `icons` — optional to Amber, required by the store. Use
  [`Icons`](../building/components#icons) with at least 16, 48, and 128 px.
- Only the `permissions` you actually use. Anything broad, `<all_urls>`
  especially, invites review questions and slows approval.

Check the dev-only additions are gone by opening `dist/manifest.json` after
`amber build`: there should be no `localhost` entry in `host_permissions`, and
no `declarativeNetRequest` permission unless you use it in production.

Uploads can be automated with the Chrome Web Store API, but that is outside
Amber — the artifact it produces is a plain zip and works with any of the
existing publishing actions.
