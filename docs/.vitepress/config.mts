import { defineConfig } from 'vitepress'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
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
        text: 'AmberJS Configuration',
        items: [
          { text: 'Overview', link: '/guide/bundler/overview' },
          { text: 'Configuration', link: '/guide/bundler/configuration'  },
          { text: 'Troubleshoot', link: '/guide/bundler/troubleshoot'  },
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
      },
      {
        text: 'Others',
        items: [
          { text: 'Setup Github Action' },
          { text: 'Integrate with Sentry' },
          { text: 'Deploy Extension To Store' }
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
})
