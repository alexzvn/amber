---
title: Overview
outline: deep
---

AmberJS using `Vite` as bundler and dev server, provide HMR directly to extension when development. You can read more on [Vite website](https://vite.dev).

Any plugin compatible with Vite and Rollup can be use with vite, following example:


:::code-group

```ts [amber.config.ts]
import { defineConfig } from '@amber.js/bundler'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  vite: {
    plugins: [vue()]
  }
})
```
:::

Since vite config is embedded to AmberJS, standalone `vite.config` will NOT work. It must place vite config under vite `amber.config.ts` section.

## Project structure

```plain
root-project
  📁 .amber
  📁 dist
  📁 public
  📁 release
  📁 src
  📄 .env
  📄 .gitignore
  📄 amber.config.ts
  📄 index.html
  📄 package.json
  📄 tsconfig.json
```

### .amber

This is where cache files of AmberJs located, it should be ignored by `.gitignore`.

### dist

The dist folder is output of AmberJs, it contains dev build or production build of the project. During development mode, select `Load Unpacked` chrome extension and point in to this folder. If you didn't see dist folder, please run build or dev server.

### public

Public folder store all of you assets and will be copy direct to `dist` folder after each build without post process.

### src

Depend on your choice, all of your source code is located here. You can customize project structure as you need.

### amber.config.ts

This is place contains config of bundler af browser manifest. If you choice javascript file name will be `amber.config.js`. Please refer to next section
to configure your project.
