import Theme from 'vitepress/theme'
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import { enhanceAppWithTabs } from 'vitepress-plugin-tabs/client'
import type { EnhanceAppContext } from 'vitepress'
import '@shikijs/vitepress-twoslash/style.css'
import './amber.css'

export default {
  extends: Theme,
  enhanceApp({ app }: EnhanceAppContext) {
    enhanceAppWithTabs(app)
    app.use(TwoslashFloatingVue)
  }
}