import { defineConfig } from 'vitepress'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs'
import { fileURLToPath } from 'url'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Amber.js",
  description: "Meta framework for building chrome extension MV3",

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    codeTransformers: [transformerTwoslash()],
    config(md) {
      md.use(tabsMarkdownPlugin)
    },
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
      { text: 'Docs', link: '/markdown-examples' }
    ],

    sidebar: [
      { text: 'Getting Started', link: '/guide/get-started' },
      {
        text: 'Development Configuration',
        items: [
          { text: 'Overview' },
          { text: 'Troubleshoot' },
        ]
      },
      {
        text: 'Amber Library',
        items: [
          { text: 'Messaging Channel' },
          { text: 'Storage' },
          { text: 'Selector' },
          { text: 'Simple Queue' },
          { text: 'Hashing' },
          { text: 'Miscellaneous' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/alexzvn/amber' },
      { icon: 'x', link: 'https://x.com/alexzvnvn' }
    ]
  },
})
