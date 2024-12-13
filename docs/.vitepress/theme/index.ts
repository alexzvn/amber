
import type { EnhanceAppContext } from 'vitepress'
import Theme from 'vitepress/theme'
import { h } from 'vue'
import Documate from '@documate/vue'
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'

import '@documate/vue/dist/style.css'
import '@shikijs/vitepress-twoslash/style.css'
import './amber.css'

const Extended = {
  ...Theme,
  Layout: h(Theme.Layout, null, {
    'nav-bar-content-before': () => h(Documate, {
      endpoint: 'https://amber-ai.alexzvn.me/ask',
    }),
  }),
}

export default {
  extends: Extended,
  enhanceApp({ app }: EnhanceAppContext) {
    app.use(TwoslashFloatingVue as any)
  }
}