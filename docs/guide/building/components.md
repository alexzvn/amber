---
title: Components
outline: deep
---

# Components

Components are the objects you put inside `manifest` in
[`amber.config.ts`](./config). Each one is both a build instruction and a
manifest fragment: it tells the bundler what to compile, and it serialises
itself into the path the manifest needs.

There are four: `BackgroundScript`, `ContentScript`, `Page`, and `Icons`.

## `BackgroundScript`

The MV3 service worker. An extension has at most one.

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

Serialises to:

```json
{ "service_worker": "entries/background.js", "type": "module" }
```

| Option | Default | Effect |
| --- | --- | --- |
| `autoReload` | `true` | Reload the worker when its source changes during `amber dev`. |

```ts twoslash
import { BackgroundScript } from '@amber.js/bundler'
// ---cut---
new BackgroundScript('src/background.ts', { autoReload: false })
```

> [!NOTE]
> During development Amber injects a background worker even if you declare
> none, because the reload channel lives there. It is not present in a
> production build.

Remember that the worker has no `window` and is terminated when idle — see [How
Amber Maps to MV3](../mv3#the-three-execution-contexts).

## `ContentScript`

Code injected into matching web pages. Unlike the others, `matches` is
required — Chrome will not inject a content script without one.

```ts twoslash
import { defineConfig, ContentScript } from '@amber.js/bundler'

export default defineConfig({
  manifest: {
    manifest_version: 3,
    name: 'my-extension',
    version: '1.0.0',
    description: 'Does a useful thing',

    content_scripts: [
      new ContentScript('src/content-script.ts', {
        matches: ['<all_urls>']
      }),

      new ContentScript('src/checkout.ts', {
        matches: ['https://example.com/checkout/*'],
        run_at: 'document_end'
      })
    ]
  }
})
```

Any standard `content_scripts` key — `run_at`, `world`,
`match_about_blank`, `match_origin_as_fallback`, `css`, `js` — is accepted and
passed through. Amber adds four of its own:

| Option | Default | Effect |
| --- | --- | --- |
| `format` | `'es'` | `'es'` allows code splitting across scripts; `'iife'` bundles everything into one self-contained file. |
| `hotReload` | `true` | Re-inject this script when its source changes during `amber dev`. |
| `cssCodeSplit` | `true` | When `false`, all CSS is extracted into a single file and linked from the manifest. |
| `scriptDir` / `assetDir` | `'scripts'` / `'assets'` | Output folders for this script's JS and assets. |

### `es` vs `iife`

Chrome does not support ES modules in content scripts. Amber works around this
by emitting an ES script as `scripts/_<name>.js` plus a small loader that
imports it — so shared code is downloaded once across several scripts.

Choose `iife` when you want one self-contained file with no loader and no shared
chunks:

```ts twoslash
import { ContentScript } from '@amber.js/bundler'
// ---cut---
new ContentScript('src/content-script.ts', {
  matches: ['<all_urls>'],
  format: 'iife'
})
```

The tradeoff is size: with several `iife` scripts, shared dependencies are
duplicated into each one.

> [!TIP]
> Import CSS directly from your content script — `import './styles.css'` — and
> Amber adds the built stylesheet to that script's manifest entry. You do not
> list it manually.

## `Page`

Any HTML entry point: a popup, an options page, a side panel, or a standalone
extension page. The argument is the HTML file, not the script it loads.

```ts twoslash
import { defineConfig, Page } from '@amber.js/bundler'

export default defineConfig({
  manifest: {
    manifest_version: 3,
    name: 'my-extension',
    version: '1.0.0',
    description: 'Does a useful thing',

    action: { default_popup: new Page('index.html') },
    options_page: new Page('options.html')
  }
})
```

A `Page` behaves like a string wherever the manifest expects one. Pass a second
argument to override the path written into the manifest while keeping the same
source file:

```ts twoslash
import { Page } from '@amber.js/bundler'
// ---cut---
new Page('src/popup/index.html', 'popup.html')
```

Pages are ordinary Vite apps — whatever framework you scaffolded with works
unchanged, including full HMR.

> [!WARNING]
> Inline `<script>` is forbidden by extension CSP. Amber extracts inline scripts
> into separate files and links them with `<script src="...">`, so existing
> templates keep working, but do not rely on inline execution order.

## `Icons`

Generates every icon size the manifest needs from one source image, using
`sharp`.

```ts twoslash
import { defineConfig, Icons } from '@amber.js/bundler'

export default defineConfig({
  manifest: {
    manifest_version: 3,
    name: 'my-extension',
    version: '1.0.0',
    description: 'Does a useful thing',

    icons: new Icons('public/logo.png')
  }
})
```

Serialises to:

```json
{
  "16": "assets/icon16.png",
  "32": "assets/icon32.png",
  "48": "assets/icon48.png",
  "128": "assets/icon128.png"
}
```

| Option | Default | Effect |
| --- | --- | --- |
| `size` | `[16, 32, 48, 128]` | Sizes to generate, in pixels. |
| `dir` | `'assets'` | Output folder inside `dist/`. |
| `name` | `'icon'` | Filename prefix — `icon16.png`, `icon32.png`, and so on. |
| `postImageProcess` | — | Hook receiving the `sharp` instance and the size, for per-size processing. |

`postImageProcess` is useful for making development builds visually distinct so
you don't confuse them with the published extension:

```ts twoslash
import { Icons } from '@amber.js/bundler'
// ---cut---
new Icons('public/logo.png', {
  size: [16, 32, 128, 256],
  dir: 'icons',
  name: 'icon-',
  postImageProcess: (img) => {
    if (process.env.NODE_ENV !== 'production') {
      img.grayscale()
    }
  }
})
```

Icons are regenerated on every build and written into `dist/` alongside the
generated manifest entry.
