---
title: Troubleshooting
outline: deep
---

# Troubleshooting

Failure modes specific to Amber and to MV3, with the reason each one happens.

## `Amber config not found`

The CLI looks for `amber.config.ts`, then `amber.config.js`, in the directory
you ran it from — not in parent directories.

Check you are in the project root, and that the file's extension matches what
you actually wrote. A TypeScript config in a JavaScript project still works;
Amber loads it through `tsx`.

## The extension breaks as soon as I stop the dev server

Working as designed. A development build loads its code from the Vite dev
server, so it has nothing to run without one.

Run `amber build` to produce a self-contained extension, then reload it from
`chrome://extensions`. See [Dev Server & HMR](./dev-server#what-a-dev-build-contains-that-production-does-not).

## `dist/` doesn't exist

The first dev build has not finished yet, or the build failed. Wait for the
server to report a completed build, or run `amber build` once.

Always load `dist/`, never the project root.

## My manifest change didn't take effect

Editing `amber.config.ts` restarts the dev server and rewrites
`dist/manifest.json`, but Chrome parsed the manifest when the extension was
loaded and does not re-read it on its own.

Press <kbd>e</kbd> in the dev server terminal, or hit reload on
`chrome://extensions`. Permission changes in particular are only applied on
extension reload.

## My `vite.config.ts` is being ignored

It is. Vite configuration must live in the [`vite`](./config#vite) field of
`amber.config.ts`, because Amber runs Vite itself rather than delegating to a
config file.

The scaffolder folds any generated Vite config into `amber.config.ts` and
deletes the original. A `vite.config.ts` you add later is silently unused.

## My content script doesn't load on some sites

Usually the site's Content Security Policy blocking the dev server origin. It
affects development only, because production builds have no external origin to
fetch from.

Set [`amber.bypassCSP`](./config#bypasscsp) — `true` for all sites, or a match
pattern to limit it:

```ts twoslash
import { defineConfig } from '@amber.js/bundler'

export default defineConfig({
  manifest: {
    manifest_version: 3,
    name: 'my-extension',
    version: '1.0.0',
    description: 'Does a useful thing'
  },

  amber: {
    bypassCSP: ['https://example.com/*']
  }
})
```

If the script still doesn't appear, check that `matches` really covers the URL
— patterns must include a scheme, and `<all_urls>` does not cover
`chrome://` pages, the Chrome Web Store, or other extensions' pages. No
extension can inject there.

## Images from `public/` are missing at runtime

Known bug: the `public/` folder is not watched, so files added while the dev
server is running are not copied into `dist/`. Embedding them through
`web_accessible_resources` then fails
([#11](https://github.com/alexzvn/amber/issues/11)).

Restart the dev server after adding files to `public/`.

## `window is not defined` in the background worker

The MV3 service worker has no DOM. There is no `window`, no `document`, no
`localStorage`. Code that assumes a browser page — including some of Amber's
own DOM helpers and any hashing built on `window.crypto` — throws when imported
into the worker.

Move DOM-dependent work into a content script and talk to the worker over
[Messaging](../api/messaging). For storage, use
[`Storage`](../api/storage), which is backed by `chrome.storage` and works in
every context.

## State in my background script keeps disappearing

The worker is terminated when idle and restarted on the next event, so
module-level variables do not survive. This is MV3 behaviour, not an Amber
quirk.

Persist anything that must outlive an event to [`Storage`](../api/storage).

## Inline `<script>` in my HTML doesn't run

Extension CSP forbids inline scripts. Amber extracts them into separate files
and links them with `<script src="...">`, which keeps most templates working —
but execution order relative to other inline code is not preserved.

Move the logic into a module and import it.

## Content scripts are bigger than expected

Several `iife` content scripts each bundle their own copy of shared
dependencies. Switch to the default `format: 'es'` so shared code is split into
`shared/` and downloaded once. See
[Components](./components#es-vs-iife).

## Something is stale and I can't explain it

Clear the toolchain cache and the dev browser profile:

```sh
amber cleanup
```

This removes `dist/` and `.amber/`. Generated types under `.amber/types/` are
rebuilt on the next run; you may need to restart your editor's TypeScript
server afterwards.
