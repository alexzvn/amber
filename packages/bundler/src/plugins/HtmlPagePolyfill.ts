import type { ResolvedConfig } from 'vite'
import Page from '~/components/Page'
import { defineVitePlugin } from '~/helper'
import Loader from '../client/__loader.js?raw'
import FirefoxLoader from '../client/__loader.firefox.js?raw'
import LoadingHTML from '~/client/loading.html?raw'
import { posix } from 'node:path'
import type { PluginOptions } from '~/configure'

export default defineVitePlugin((amber: PluginOptions = {}) => {
  let config: ResolvedConfig

  return {
    name: 'amber:html-page-polyfill',
    apply: 'build',

    configResolved(_config) {
      config = _config
    },

    async generateBundle() {
      if (!config.mode.startsWith('dev')) return

      for (const page of Page.$registers) {
        this.emitFile({
          type: 'asset',
          fileName: posix.join(page.path.dir, page.path.filename!),
          source: LoadingHTML
            .replace(/LOADER_SCRIPT/, '/entries/__loader.js')
            .replaceAll(/VITE_URL/g, `http://localhost:${config.server.port}`)
        })
      }

      this.emitFile({
        type: 'prebuilt-chunk',
        fileName: 'entries/__loader.js',
        code: amber.browser === 'firefox' ? FirefoxLoader : Loader
      })
    }
  }
})
