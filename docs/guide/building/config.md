---
title: amber.config.ts
outline: deep
---

# `amber.config.ts`

One file configures the manifest, the bundler, and Amber's own behaviour. This
page is the reference for its four fields; the pages after it zoom into
individual parts.

Amber looks for `amber.config.ts`, then `amber.config.js`, in the directory you
run the CLI from. If neither exists the command fails with
`Amber config not found`.

## The whole surface

```ts twoslash
import { defineConfig } from '@amber.js/bundler'

export default defineConfig({
  // Required. Your MV3 manifest, with Amber component objects allowed
  // anywhere a path string would go.
  manifest: {
    manifest_version: 3,
    name: 'my-extension',
    version: '1.0.0',
    description: 'Does a useful thing'
  },

  // Optional. Extra manifest fields applied only during `amber dev`.
  devManifest: {},

  // Optional. Vite config, embedded — a standalone vite.config.ts is ignored.
  vite: {},

  // Optional. Amber's own toggles.
  amber: {}
})
```

## `manifest`

Required. A standard [MV3
manifest](https://developer.chrome.com/docs/extensions/reference/manifest), with
one difference: wherever the spec expects a path string, you may pass an Amber
component object instead, and Amber fills in the built path.

```ts twoslash
import {
  defineConfig,
  BackgroundScript,
  ContentScript,
  Icons,
  Page
} from '@amber.js/bundler'
// ---cut---
export default defineConfig({
  manifest: {
    manifest_version: 3,
    name: 'my-extension',
    version: '1.0.0',
    description: 'Does a useful thing',

    icons: new Icons('public/logo.png'),
    action: { default_popup: new Page('index.html') },
    background: new BackgroundScript('src/background.ts'),
    content_scripts: [
      new ContentScript('src/content-script.ts', {
        matches: ['<all_urls>']
      })
    ]
  }
})
```

`manifest_version`, `name`, `version`, and `description` are required — the
config will not type-check without all four. `icons` is optional to Amber but
required by the Chrome Web Store before you can publish. The four component
classes are documented in [Components](./components).

Fields Amber adds for you, so you don't have to:

- `web_accessible_resources` gains `shared/*` and `scripts/*` for `<all_urls>`,
  because code-split chunks and content scripts must be fetchable by the page.
- `permissions` gains `declarativeNetRequest` when `amber.bypassCSP` is set.
- In development only: `host_permissions` gains your dev server origin, all
  resources become web-accessible, and a background worker is injected if you
  declared none.

### Version numbers

Chrome requires a dotted-integer `version` and rejects anything else, which
makes semver pre-release tags like `1.2.0-beta.3` unusable. The `version` helper
splits a package version into the two forms Chrome accepts:

```ts twoslash
// @filename: package.json
{
  "name": "my-extension",
  "version": "1.2.0-beta.3"
}
// @filename: amber.config.ts
// ---cut---
import { defineConfig, version } from '@amber.js/bundler'
import pkg from './package.json'

export default defineConfig({
  manifest: {
    manifest_version: 3,
    name: pkg.name,
    version: version(pkg.version).full,
    version_name: pkg.version,
    description: 'Does a useful thing'
  }
})
```

`version('1.2.0-beta.3').full` is `'1.2.0.3'` — valid for Chrome — while
`version_name` keeps the human-readable original.

## `devManifest`

Manifest fields applied **only** during `amber dev`. Useful for permissions you
want while debugging but not in the published extension.

```ts twoslash
import { defineConfig } from '@amber.js/bundler'

export default defineConfig({
  manifest: {
    manifest_version: 3,
    name: 'my-extension',
    version: '1.0.0',
    description: 'Does a useful thing'
  },

  devManifest: {
    permissions: ['tabs', 'debugger']
  }
})
```

> [!IMPORTANT]
> `devManifest` **fills gaps, it does not override.** The two are merged with
> `manifest` taking precedence, so a key present in both keeps its `manifest`
> value. Use `devManifest` to add fields that are absent in production, not to
> change existing ones.

## `vite`

Amber runs Vite internally, so Vite configuration lives here rather than in a
separate file.

> [!WARNING]
> A standalone `vite.config.ts` is **not read**. The scaffolder folds any
> generated Vite config into this field and deletes the original file. If you
> add one later, its contents are silently ignored.

Any Vite or Rollup plugin works:

```ts twoslash
// @filename: shim.d.ts
declare module '@vitejs/plugin-vue' {
  const plugin: () => any
  export default plugin
}
// @filename: amber.config.ts
// ---cut---
import { defineConfig } from '@amber.js/bundler'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  manifest: {
    manifest_version: 3,
    name: 'my-extension',
    version: '1.0.0',
    description: 'Does a useful thing'
  },

  vite: {
    plugins: [vue()]
  }
})
```

Amber sets some Vite options itself — entry points, output file naming, and in
development the server host, port `5173`, CORS, and HMR. Your config is merged
over Amber's defaults, so overriding `server.port` works and the HMR port
follows it.

### Path aliases

Aliases are ordinary Vite config, but they need a matching `tsconfig.json` entry
to stay type-safe. Both halves:

:::code-group

```ts [amber.config.ts] twoslash
import { defineConfig } from '@amber.js/bundler'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  manifest: {
    manifest_version: 3,
    name: 'my-extension',
    version: '1.0.0',
    description: 'Does a useful thing'
  },

  vite: {
    resolve: {
      alias: [
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }
      ]
    }
  }
})
```

```json [tsconfig.json]
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

:::

`import foo from '@/module-a/foo'` now resolves from anywhere, instead of
`../../../module-a/foo`.

## `amber`

Amber's own options.

### `bypassCSP`

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
    bypassCSP: true
  }
})
```

Default `false`. **Development only** — it has no effect on a production build.

A content script running in the main world inherits the page's Content Security
Policy. On sites with a strict policy that blocks the dev server origin, your
script cannot load its own code and hot reload dies. Setting `bypassCSP` injects
a rule that strips the offending policy while you develop.

`true` applies to every site. Pass a match pattern, or an array of them, to
limit the blast radius:

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

Enabling it adds the `declarativeNetRequest` permission and merges the patterns
into `host_permissions`.

## Editing the config while the server runs

The dev server watches `amber.config.*` and restarts itself when it changes, so
manifest edits apply without you stopping anything. Chrome still needs to pick
up the new `manifest.json` — press <kbd>e</kbd> in the dev server terminal to
reload the extension.
