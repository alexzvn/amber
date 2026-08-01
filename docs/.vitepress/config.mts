import { defineConfig } from 'vitepress'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { createFileSystemTypesCache } from '@shikijs/vitepress-twoslash/cache-fs'
import { fileURLToPath } from 'url'
import ts from 'typescript'
import { copyFile, mkdir } from 'fs/promises'
import { dirname, join } from 'path'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Amber.js",
  description: "Meta framework for building chrome extension MV3",

  // Agent-facing docs (docs/agents/*), research notes (docs/research/*) and the
  // domain glossary (docs/CONTEXT.md) are repo config, not published pages.
  srcExclude: ['agents/**', 'research/**', 'CONTEXT.md'],

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    codeTransformers: [
      transformerTwoslash({
        typesCache: createFileSystemTypesCache(),
        // `^?` queries default to an absolutely-positioned popup that reserves
        // no height, so it overlaps the code and prose below it. Render them
        // in the code flow instead.
        queryRendering: 'popup',
        twoslashOptions: {
          compilerOptions: {
            // @amber.js/bundler ships types via `exports` only, so node10
            // resolution (twoslash's default) cannot find them.
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            resolveJsonModule: true
          }
        }
      })
    ],
  },

  vite: {
    resolve: {
      alias: [{ find: '@components', replacement: fileURLToPath(new URL('./components', import.meta.url)) }]
    }
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Docs', link: '/guide/get-started' }
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Get Started', link: '/guide/get-started' },
          { text: 'How Amber Maps to MV3', link: '/guide/mv3' },
        ]
      },
      {
        text: 'Building',
        items: [
          { text: 'amber.config.ts', link: '/guide/building/config' },
          { text: 'Components', link: '/guide/building/components' },
          { text: 'Dev Server & HMR', link: '/guide/building/dev-server' },
          { text: 'Troubleshooting', link: '/guide/building/troubleshooting' },
        ]
      },
      {
        text: 'Runtime API',
        items: [
          { text: 'Messaging', link: '/guide/api/messaging' },
          { text: 'Storage', link: '/guide/api/storage' },
          { text: 'DOM & Utilities', link: '/guide/api/dom-utilities' },
        ]
      },
      {
        text: 'Shipping',
        items: [
          { text: 'Build, Archive & Release', link: '/guide/shipping/build' },
          { text: 'Error Reporting with Sentry', link: '/guide/shipping/sentry' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/alexzvn/amber' },
      { icon: 'x', link: 'https://x.com/alexzvnvn' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Alexzvn'
    }
  },

  // llms.txt links to `<page>.md`, so ship the markdown sources alongside the
  // rendered HTML. `pages` already has srcExclude applied.
  async buildEnd({ srcDir, outDir, pages }) {
    await Promise.all(pages.map(async page => {
      const dest = join(outDir, page)
      await mkdir(dirname(dest), { recursive: true })
      await copyFile(join(srcDir, page), dest)
    }))
  },
})
