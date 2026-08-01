---
title: How Amber Maps to MV3
outline: deep
---

# How Amber Maps to MV3

You have a running extension. This page explains what the toolchain did, in
terms of the three things MV3 actually gives you. Everything past this page
assumes the vocabulary introduced here.

> [!IMPORTANT]
> Amber targets **Manifest V3** for Chromium and Safari. Firefox add-ons are
> not supported.

## The three execution contexts

An extension is not one program. It is up to three, running in different
processes, with different globals, that can only talk over message passing.

| Context | Where it runs | Has `window`? | Has `chrome.*`? | Typical job |
| --- | --- | --- | --- | --- |
| **Background** | A service worker owned by the browser | No | Yes, most of it | Long-lived state, alarms, network calls, cross-tab coordination |
| **Content script** | Injected into a web page, sharing its DOM but not its JS scope | Yes — the *page's* | Yes, a small subset | Reading and modifying the page |
| **Page** (popup, options, any extension HTML) | A normal browser tab or panel on a `chrome-extension://` origin | Yes — its own | Yes, most of it | UI |

Three consequences that cause most MV3 bugs:

- **The background worker has no DOM.** No `window`, no `document`,
  no `localStorage`. It is also *terminated aggressively* when idle and
  restarted on the next event, so module-level state does not survive.
- **Content scripts are isolated.** Your code and the page's code see the same
  DOM but different JavaScript globals. A variable the page defines is not
  visible to you by default.
- **Nothing is shared.** Passing data between these contexts is message
  passing, always. This is the problem [Messaging](./api/messaging) exists to
  solve.

Amber detects which context your code is running in at runtime, by checking for
`window` and comparing the current origin to the extension's own origin. You
never declare it.

## The manifest is generated

In a raw MV3 project, `manifest.json` is a hand-written file whose paths must
match whatever your bundler emitted. Every rename is two edits, and a mismatch
is a silent failure.

In Amber, `amber.config.ts` is the source and `dist/manifest.json` is output.
When you write:

```ts twoslash
import { defineConfig, BackgroundScript } from '@amber.js/bundler'

export default defineConfig({
  manifest: {
    manifest_version: 3,
    name: 'my-extension',
    version: '1.0.0',
    description: 'Does a useful thing',
    background: new BackgroundScript('src/background.ts')
  }
})
```

...the `BackgroundScript` object serialises itself into the manifest as:

```json
{
  "background": {
    "service_worker": "entries/background.js",
    "type": "module"
  }
}
```

The output path is derived from the entrypoint, not typed by you. The same holds
for content scripts, pages, and icons — each [component](./building/components)
knows both how to be built and how to describe itself in the manifest.

## What ends up in `dist/`

```plain
dist
├─ entries/          # background worker and page entrypoints
├─ scripts/          # content scripts
├─ shared/           # code split out of multiple entrypoints
├─ assets/           # css, images, generated icons
├─ index.html        # your pages, one html file each
└─ manifest.json     # generated
```

Content scripts land in `scripts/`, everything else entry-like in `entries/`.
An ES-format content script is emitted as `scripts/_<name>.js` and paired with a
small loader, because Chrome does not support ES modules in content scripts
directly — Amber polyfills that. An `iife` content script needs no loader and
is emitted as `scripts/<name>.js`.

## The rest of the project

```plain
my-extension
├─ .amber/           # toolchain cache and generated types — gitignored
├─ dist/             # build output, load this folder in Chrome
├─ public/           # copied to dist/ verbatim, no processing
├─ release/          # zips produced by `amber archive` — gitignored
├─ src/              # your code, structured however you like
├─ amber.config.ts   # manifest + bundler config
└─ index.html        # entry html for a page
```

`.amber/types/env.d.ts` is worth knowing about: Amber writes your `VITE_`-prefixed
environment variables into it as typed fields on `import.meta.env`, so `.env`
entries are autocompleted rather than `any`.

## Development differs from production on purpose

In development your extension is a thin shell that loads code from the Vite dev
server, which is what makes hot reload possible across contexts. Amber adds
things to the dev build that are absent from production:

- A background worker is injected even if you declared none, because the reload
  channel lives there.
- Reload plumbing is injected into the worker and content scripts.
- Optionally, a Content Security Policy bypass so content scripts running in
  the main world can still reach the dev server — see
  [`amber.bypassCSP`](./building/config#amber).

Production builds contain none of this. Which is also why an extension loaded
from `dist/` stops working when you stop the dev server: [Dev Server &
HMR](./building/dev-server) covers the split in detail.
