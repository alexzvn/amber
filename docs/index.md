---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Amber.js"
  text: "Meta framework for building chrome extension MV3"
  tagline: Write the extension. Let the toolchain write the manifest.
  image:
    src: /amber.webp
    alt: Amber.js
  actions:
    - theme: brand
      text: Get Started
      link: /guide/get-started
    - theme: alt
      text: How it maps to MV3
      link: /guide/mv3
    - theme: alt
      text: GitHub
      link: https://github.com/alexzvn/amber

features:
  - title: The manifest is derived
    icon: 📄
    details: Declare entrypoints as objects in amber.config.ts. Amber resolves paths, generates icons and writes manifest.json for you.
  - title: HMR that reaches the worker
    icon: ⚡️
    details: Vite HMR for pages, plus injected reload for the service worker and content scripts. No manual reload cycle in chrome://extensions.
  - title: Typed cross-context messaging
    icon: 🛡️
    details: Call a background handler from a content script and get its real return type back. Handler signatures propagate across contexts.
---

## What Amber replaces

Every MV3 project starts with the same wiring: a hand-maintained `manifest.json`
whose paths must match your build output, a bundler config that emits each
entrypoint in the right format, and a reload story that MV3's service worker
actively fights.

Amber makes the manifest a **build artifact**. You declare entrypoints as
objects; the toolchain resolves their real output paths and writes the JSON.

:::code-group

```json [Raw MV3 — manifest.json]
{
  "manifest_version": 3,
  "name": "my-extension",
  "version": "1.0.0",
  "icons": {
    "16": "assets/icon16.png",
    "32": "assets/icon32.png",
    "48": "assets/icon48.png",
    "128": "assets/icon128.png"
  },
  "action": { "default_popup": "index.html" },
  "background": {
    "service_worker": "entries/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["scripts/content-script.js"]
    }
  ]
}
```

```ts [Amber — amber.config.ts] twoslash
import {
  defineConfig,
  BackgroundScript,
  ContentScript,
  Icons,
  Page
} from '@amber.js/bundler'

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

:::

The four icon sizes on the left are files you have to produce and keep in sync.
On the right they are generated from one source image at build time. The output
paths on the left are strings you have to keep matching your bundler's naming
config; on the right they are computed from the entrypoint you declared.

## Typed messaging across contexts

Chrome gives you `chrome.runtime.sendMessage` and an untyped payload. Amber
gives you the handler's actual signature, checked at the call site.

```ts twoslash
// @filename: background.ts
import { Messaging } from '@amber.js/core'

const channel = new Messaging()
  .handle('user.rename', (id: number, name: string) => ({ id, name }))

export type BackgroundChannel = typeof channel

// @filename: content.ts
// ---cut---
import { Messaging } from '@amber.js/core'
import type { BackgroundChannel } from './background'

const background = Messaging.getBackgroundChannel<BackgroundChannel>()

const user = await background.send('user.rename', 1, 'Ada')
//    ^?
```
