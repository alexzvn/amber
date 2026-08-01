---
title: Error Reporting with Sentry
outline: deep
---

# Error Reporting with Sentry

Getting Sentry working in MV3 is not the standard browser setup. This page is
derived from a production extension built with Amber, and the short version is:

> [!IMPORTANT]
> **Do not call `Sentry.init()`.** Construct a `BrowserClient` and a `Scope`
> yourself, drop the integrations that assume browser globals, force the fetch
> transport, and rewrite stack frames off the `chrome-extension://` origin.

`Sentry.init` installs a global hub on `window` and switches on machinery that
patches `document` and `XMLHttpRequest`. The service worker has no `window`,
and each execution context is a separate realm, so the global-hub model does
not survive the boundary.

```sh
npm install @sentry/browser
```

## The shared client

One module, imported by every context. The bundler emits it once into
`shared/`, so all three contexts share the code without sharing state.

```ts twoslash
// @filename: env.d.ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN: string
  readonly VITE_SENTRY_RELEASE: string
  readonly VITE_SENTRY_RATE: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
// @filename: sentry.ts
// ---cut---
import {
  BrowserClient,
  Scope,
  defaultStackParser,
  getDefaultIntegrations,
  makeFetchTransport,
  rewriteFramesIntegration
} from '@sentry/browser'

const dsn = import.meta.env.VITE_SENTRY_DSN
const release = import.meta.env.VITE_SENTRY_RELEASE
const rate = +import.meta.env.VITE_SENTRY_RATE || 0.2

// Drop the integrations that reach for browser globals.
const integrations = getDefaultIntegrations({}).filter(
  (integration) => ![
    'BrowserApiErrors',
    'Breadcrumbs',
    'GlobalHandlers'
  ].includes(integration.name)
)

export const client = new BrowserClient({
  dsn,
  release,
  environment: import.meta.env.MODE,
  sampleRate: rate,
  transport: makeFetchTransport,
  stackParser: defaultStackParser,
  integrations: [
    ...integrations,
    rewriteFramesIntegration({
      prefix: '/',
      root: `chrome-extension://${chrome.runtime.id}/`
    })
  ]
})

export const scope = new Scope()
scope.setClient(client)

export const isEnable = !!dsn

if (isEnable) {
  client.init()
}
```

Why each piece is there:

| Decision | Without it |
| --- | --- |
| `BrowserClient` + `Scope` instead of `Sentry.init` | The global hub assumes `window`; the worker has none. |
| Filter `BrowserApiErrors`, `Breadcrumbs`, `GlobalHandlers` | They patch `window`, `document`, and `XMLHttpRequest` — throwing in the worker, and hijacking page handlers from a content script. |
| `transport: makeFetchTransport` | Default transport selection can land on `sendBeacon`/XHR paths that don't exist in a worker. |
| `rewriteFramesIntegration` | Frames carry a per-install random `chrome-extension://<id>/` origin, so uploaded source maps never match and every stack stays minified. |
| `isEnable` DSN gate | With an empty DSN in development you'd construct a client that tries to ship local noise. |

## Wiring each context

Removing `GlobalHandlers` means **nothing is captured automatically**. You wire
capture per context.

### Background worker

The worker has no `window`, so listen on `globalThis`:

```ts twoslash
// @filename: sentry.ts
import { Scope } from '@sentry/browser'
export const scope = new Scope()
export const isEnable = true
// @filename: sentry.background.ts
// ---cut---
import { scope, isEnable } from './sentry'

isEnable && globalThis.addEventListener('error', (e) => {
  scope.captureException((e as ErrorEvent).error)
})

isEnable && globalThis.addEventListener('unhandledrejection', (e) => {
  scope.captureException((e as PromiseRejectionEvent).reason)
})
```

Import it for its side effects from your background entry:

```ts
import './sentry.background'
```

### Content scripts and pages

Global handlers are unreliable in content scripts, so export an explicit capture
function and call it where you handle errors:

```ts twoslash
// @filename: sentry.ts
import { Scope } from '@sentry/browser'
export const scope = new Scope()
export const isEnable = true
// @filename: sentry.content.ts
// ---cut---
import type { EventHint } from '@sentry/browser'
import { scope, isEnable } from './sentry'

export const capture = (error: unknown, hint?: EventHint) => {
  return isEnable && scope.captureException(error, hint)
}
```

> [!WARNING]
> Content scripts are **not** covered automatically. Errors reach Sentry only
> where your code calls `capture()`. Funnel them through a shared wrapper —
> Amber's [`Misc.safeCall` and `Misc.safeAsyncCall`](../api/dom-utilities#misc)
> both take an error handler, which makes a good single choke point.

A script injected with `world: 'MAIN'` runs in the page's realm and is not
covered by any of this. If you inject one, it needs its own reporting path.

## You do not need a CSP or host permission entry

A common wrong turn is adding `connect-src` to
`content_security_policy`, or the Sentry ingest host to `host_permissions`.
Neither is required:

- MV3's default `extension_pages` policy restricts `script-src` and
  `object-src`. It does not gate `fetch`, so the worker and your pages can post
  events freely.
- Content scripts run in the isolated world, where the *page's* CSP does not
  apply to their `fetch`.

[`amber.bypassCSP`](../building/config#bypasscsp) is unrelated — it exists for
dev-server access, is development-only, and is not part of a Sentry setup.

## Configuration

Amber loads `.env` and exposes `VITE_`-prefixed variables as `import.meta.env`,
writing types for them into `.amber/types/env.d.ts`. Three variables:

| Variable | Purpose |
| --- | --- |
| `VITE_SENTRY_DSN` | Your project DSN. Leave empty in development to disable reporting. |
| `VITE_SENTRY_RELEASE` | Release identifier — must match what you upload source maps against. |
| `VITE_SENTRY_RATE` | Sample rate, `0` to `1`. |

> [!DANGER]
> Do not commit a real DSN. Keep it in CI variables and out of `.env` files
> that are tracked by git.

## Source maps

Without maps, every stack is minified. Build them in CI and upload them —
`hidden` keeps the `.map` files out of the browser's reach while still letting
Sentry symbolicate:

```sh
amber build --prod --sourcemap hidden
```

Then upload with Sentry's release action:

```yaml [.github/workflows/release.yml]
name: Release

on:
  push:
    tags: ['v*']

jobs:
  sentry:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile

      - run: bun run build --prod --sourcemap hidden
        env:
          VITE_SENTRY_DSN: ${{ vars.VITE_SENTRY_DSN }}
          VITE_SENTRY_RATE: ${{ vars.VITE_SENTRY_RATE }}
          VITE_SENTRY_RELEASE: ${{ github.ref_name }}

      - uses: getsentry/action-release@v1.7.0
        with:
          sourcemaps: './dist'
          environment: production
          version: ${{ github.ref_name }}
        env:
          SENTRY_ORG: ${{ vars.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ vars.SENTRY_PROJECT }}
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

> [!IMPORTANT]
> `VITE_SENTRY_RELEASE` and the action's `version` **must be the same string**.
> Mixing `github.ref_name` (`v1.2.0`) with `github.ref`
> (`refs/tags/v1.2.0`) is an easy mistake: uploads attach to a release name your
> events never carry, and every stack stays minified with no error to tell you
> why.
>
> Also make sure the artifact you ship to users is the same build you uploaded
> maps for. Rebuilding separately for the upload produces different chunk
> hashes and the maps won't match.

## Privacy

`scope.setUser` is the usual way to attach identity, typically fed from
extension storage so every context reports the same user:

```ts twoslash
// @filename: sentry.ts
import { Scope } from '@sentry/browser'
export const scope = new Scope()
// @filename: user.ts
// ---cut---
import { Storage } from '@amber.js/core'
import { scope } from './sentry'

const account = Storage.item<{ id: string, email: string } | null>('account', null)

account.subscribe((user) => {
  scope.setUser(user ? { id: user.id, email: user.email } : null)
})
```

Extensions see more than websites do — page URLs, DOM content, and anything you
attach as context. Decide deliberately what leaves the user's machine, and add a
`beforeSend` hook to strip anything you don't need. An extension that reports
the full URL of every page a user visits is a privacy incident waiting to
happen.
