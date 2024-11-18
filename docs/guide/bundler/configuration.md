---
title: AmberJs configuration
outline: deep
---

Before you start, it's recommended you have some basic understand how to build extension first. [Chrome extension developer](https://developer.chrome.com/docs/extensions/get-started) and [MDN web docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions) provide
good start resource that you can refer to begin with.

> [!IMPORTANT]
> AmberJS current only support **Manifest version 3** (MV3) compatible with Chromium and Safari. Build for Firefox add-on currently unsupported.


## Browser Manifest
To start configure browser manifest, locate `amber.config.ts` and start edit `manifest` section.

:::code-group
```ts [amber.config.ts]
import { defineConfig } from '@amber.js/bundler'

export default defineConfig({
  manifest: {
    manifest_version: 3,
    name: 'My extension',
    version: '0.0.1',
    description: 'Example description for the extension'
  }
})
```
:::

Field `manifest_version`, `name`, `version` is required for every extension.
Other fields like `description` and `icon` are required for publish to the store.
You could find more configuration to fit your need at Chrome extension [manifest document section](https://developer.chrome.com/docs/extensions/reference/manifest#minimal-manifest).

## Icons

AmberJs build-in image processing power by `sharp` library. To add icon to your project, simply do as following:

:::code-group

```ts [Default]
import { defineConfig, Icons } from '@amber.js/bundler'

export default defineConfig({
  manifest: {
    manifest_version: 3,
    name: 'My extension',
    version: '0.0.1',
    description: 'Example description for the extension',

    icons: new Icons('path/to/your/image')
  }
})
```

```ts [Customize]
import { defineConfig, Icons } from '@amber.js/bundler'

export default defineConfig({
  manifest: {
    icons: new Icons('path/to/your/image', {
      size: [16, 32, 128, 256],
      dir: 'icons',
      name: 'icon-',
      postImageProcess: (img) => {
        if (process.env.MODE !== 'production') {
          // set icon to black-white when in development
          img.grayscale()
        }
      }
    })
  }
})
```

:::

During build process, AmberJs auto generate manifest json related to icons config and save processed image under `dist` folder each run.

## Page

A page represent a `Single Page Application` (SPA). One extension could have many page as needed that include a popup, options page or just internal page. The entry of page is html
file located somewhere in the project.

To start with, here is example:
:::code-group

```ts [amber.config.ts]
import { defineConfig, Page } from '@amber.js/bundler'

export default defineConfig({
  manifest: {
    action: {
      default_popup: new Page('index.html')
    }
  }
})
```

```html [index.html]
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + TS</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

:::

> [!NOTE]
> Inline script is not allowed for chrome extension. AmberJS will split on septate file and embedded to html file by `<script src="..."></script>` tags.

## Content Script

Almost every extension will have injected script by default. The content script may provide extra function of enhance website experience. To add content script, following code example:

:::code-group

```ts [amber.config.ts]
import { defineConfig, ContentScript } from '@amber.js/bundler'

export default defineConfig({
  manifest: {
    content_scripts: [
      new ContentScript('src/content-script.ts', {
        matches: ['<all_urls>'],
      }),

      new ContentScript('src/other-script.ts', {
        matches: ['https://example.com/*']
      })
    ]
  }
})
```

:::

By default, all content script will bundle as ES module which support file chunking to save extension size. If you whish to make it contain all at one, set `format` field to `iife`.

Also, every content script instance enable hot reload by default. You may want to disable it in special case by set `hotReload` to `false`.

> [!TIP]
> When injected script need extra css file to styling the website, just import directly to content script. AmberJs will handle the rest.

## Background Script

Background script has vital role to other things even user not run content script in specified website.
The script commonly used to schedule job, modify request of browser or do other heavy lifting stuff.
As manifest version 3, one extension is only have one background script. To add background script to 
your extension, following example bellow:

:::code-group

``` ts [amber.config.ts]
import { defineConfig, BackgroundScript } from '@amber.js/bundler'

export default defineConfig({
  manifest: {
    ...
    background: new BackgroundScript('src/background.ts')
  }
})
```

:::

During development state, even if you don't specify any background script, AmberJS automatically inject
background script to manifest for underling framework function to work.

## Alias and Typescript

To make it more easy to handle import file, it's recommended you to have alias root path of the project
instead using relative path like `../../../../MyModule.ts`, the better option would be `@/MyModule.ts`.
This practice useful if your module is deeply inside many folder.

To handle alias, you need config `vite` inside `amber.config.js` or `amber.config.js` if you're using
javascript. Following is example that how you can able to configure alias of the project.

:::code-group
``` js [amber.config.ts]
import { defineConfig } from '@amber.js/bundler'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  manifest: {
    ...
  },

  vite: {
    resolve: {
      alias: [
        find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url))
      ]
    }
  }
})
```
:::

After configuration, you can able to import file in `src/module-a/foo` to `src/module-b/bar` by
using import statement `import foo from '@/module-a/foo'` instead of `import foo from '../module-a/foo`.
To make it type safe you also need to config the `tsconfig.json` file corresponding to path that you deserve.

:::code-group
``` json [tsconfig.json]
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
:::