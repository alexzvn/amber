---
title: Dev Server & HMR
outline: deep
---

# Dev Server & HMR

`amber dev` runs a Vite dev server and writes an unpacked extension to `dist/`
that loads its code from that server. This is what makes hot reload work across
all three execution contexts — and why the extension stops working when you
stop the server.

```sh
amber dev
```

| Flag | Effect |
| --- | --- |
| `-d`, `--dev-browser` | Launch an isolated Chromium with the extension preloaded. |

## What a dev build contains that production does not

A development build is a thin shell. Amber adds machinery that is entirely
absent from `amber build`:

- **A background worker, always.** If you declared no `BackgroundScript`, one is
  injected — the reload channel lives in the worker, so there has to be one.
- **Reload plumbing** injected into the worker and into content scripts.
- **Dev-server access**: your `host_permissions` gain the dev server origin, and
  all resources are marked web-accessible so the page can fetch them.
- **Optionally a CSP bypass**, if you set
  [`amber.bypassCSP`](./config#bypasscsp).
- **Anything in [`devManifest`](./config#devmanifest)** that isn't already in
  `manifest`.

This is why you should never ship a `dist/` produced by `amber dev`. Run
`amber build` before packaging.

## What reloads, and how

| You change | What happens |
| --- | --- |
| A page (popup, options, any framework component) | Standard Vite HMR — the module swaps in place, state is preserved where the framework allows. |
| A content script | Rebuilt and re-injected into matching tabs. Disable per script with `hotReload: false`. |
| The background worker | Rebuilt and the worker restarted. Disable with `autoReload: false`. |
| `amber.config.ts` | The whole dev server restarts, because the manifest may have changed. |

MV3 makes the worker the hard case: a service worker cannot be hot-patched the
way a page module can, and Chrome terminates it when idle. Amber injects a small
loader that reconnects to the dev server and restarts the worker on change,
rather than making you click reload in `chrome://extensions`.

### Manifest changes need a browser-side reload

When `amber.config.ts` changes, the dev server restarts and rewrites
`dist/manifest.json` — but Chrome has already parsed the old manifest. Press
<kbd>e</kbd> in the terminal, or reload the extension from
`chrome://extensions`, for permission and entrypoint changes to take effect.

## Terminal shortcuts

The dev server adds two shortcuts to Vite's usual set:

| Key | Action |
| --- | --- |
| <kbd>e</kbd> | Reload the browser extension |
| <kbd>p</kbd> | Reload the current active tab |

## The isolated dev browser

```sh
amber dev --dev-browser
```

Launches a persistent Chromium profile at `.amber/browser/chrome` with your
`dist/` folder loaded via `--load-extension`, so you never touch
`chrome://extensions` or pollute your daily profile with a development build.

The scaffolder wires this up as `npm run dev:browser` if you answered yes to the
isolated-browser prompt. It requires Playwright, which that prompt adds as a
dev dependency along with a `prepare` script that downloads the browser.

Two details worth knowing:

- **Tab restore is unreliable.** The server saves the URLs of open tabs on
  restart and is meant to reopen them, but this currently does not work when
  the restart is triggered by editing `.env` or `amber.config.ts`
  ([#10](https://github.com/alexzvn/amber/issues/10)).
- **`bypassCSP: true` is applied at the browser level too**, not just via
  injected rules.

## Server configuration

Amber's defaults are `localhost:5173` with CORS enabled and HMR on the same
host and port. Override through the [`vite`](./config#vite) field — the HMR
config follows whatever you set:

```ts twoslash
import { defineConfig } from '@amber.js/bundler'

export default defineConfig({
  manifest: {
    manifest_version: 3,
    name: 'my-extension',
    version: '1.0.0',
    description: 'Does a useful thing'
  },

  vite: {
    server: { port: 4000 }
  }
})
```

`dist/` and `.amber/browser/` are excluded from the file watcher, so build
output does not trigger rebuild loops.

## Environment variables

`.env` is loaded at startup, and Vite's usual rule applies: only `VITE_`-prefixed
variables are exposed to your code as `import.meta.env`.

Amber additionally writes `.amber/types/env.d.ts` declaring each of those
variables, so `import.meta.env.VITE_API_URL` is typed as `string` instead of
`any`. The scaffolder adds `.amber/types/*.ts` to your `tsconfig.json` include
list. The file is regenerated when `.env` changes.

## Cleaning up

```sh
amber clean     # remove dist/
amber cleanup   # remove dist/ and .amber/
```

Use `cleanup` when the toolchain cache or the dev browser profile is in a bad
state — see [Troubleshooting](./troubleshooting).
