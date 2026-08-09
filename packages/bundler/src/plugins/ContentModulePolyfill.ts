import {defineVitePlugin, mkdir} from '~/helper'
import type {ResolvedConfig, ViteDevServer} from 'vite'
import {join, posix} from 'path'
import ContentScript from '~/components/ContentScript'
import CSPolyfillDev from '~/client/content-script.iife.dev.js?raw'
import CSPolyfillProd from '~/client/content-script.iife.prod.js?raw'

import fs from "fs/promises"
import type { AmberOptions } from '../configure'
import slash from 'slash'


export default defineVitePlugin((amber: AmberOptions = {}) => {
  let outdir = 'dist'
  let config: ResolvedConfig
  let server: ViteDevServer|undefined

  return [{
    name: 'amber:content-module-polyfill',

    config(cfg) {
      cfg.build ??= {}
      cfg.build.rollupOptions ??= {}
      cfg.build.rollupOptions.output ??= {}

      const output = Array.isArray(cfg.build.rollupOptions.output)
        ? cfg.build.rollupOptions.output[0]
        : cfg.build.rollupOptions.output

      output.entryFileNames = (chunk) => {
        const script = ContentScript.$registers.find(script => {
          return chunk.facadeModuleId?.endsWith(script.file)
        })

        if (script?.options.format === 'iife') {
          return 'scripts/[name].js'
        }

        return script ? 'scripts/_[name].js' : 'entries/[name].js'
      }
    },

    configResolved(cfg) {
      outdir = cfg.build.outDir
      config = cfg
    },

    configureServer(_server) {
      server = _server
    },

    async buildStart() {
      if (config.mode !== 'development') {
        return
      }

      await mkdir(join(outdir, 'scripts'))
      const host = `http://localhost:${config.server.port}/`

      for (const script of ContentScript.$registers) {
        if (script.options.format !== 'es' && !server) {
          continue
        }

        const enableReload = script.options.hotReload
        const code = CSPolyfillDev
          .replace(/__PRE_SCRIPT__/g, `"${host}@vite/client"`)
          .replace(/__SCRIPT__/g, `"${host}${slash(script.file)}"`)
          .replace(/__ALLOW_FULL_RELOAD__/g, enableReload.toString())

        await fs.writeFile(join(outdir, 'scripts', script.path.name + '.js'), code)
      }
    },

    transform(_code, id) {
      if (!id.includes('/vite/dist/client/client')) {
        return
      }

      const lines = _code.split('\n')
      const reloadLine = lines.findIndex((line) => {
        return line.includes(`case 'full-reload':`) || line.includes(`case "full-reload":`)
      })

      if (reloadLine === -1) {
        return this.warn('Disable auto reload may not work.')
      }

      const [space] = lines[reloadLine + 1].match(/^\s+/)!

      const inject = [
        space + `if ('_AMBER_ALLOW_RELOAD' in window && window['_AMBER_ALLOW_RELOAD'] !== true) {`,
        space + `    break;`,
        space + `}`,
      ]

      const injected = [
        ... lines.slice(0, reloadLine + 1),
        ... inject,
        ... lines.slice(reloadLine + 1)
      ]

      return { code: injected.join('\n') }
    },

    /**
     * Collects the CSS each ContentScript pulled in, so ManifestWriter can
     * serialize it into `content_scripts[].css`.
     *
     * ORDER-SENSITIVE: ManifestWriter emits manifest.json from its own
     * `generateBundle`, and Rollup runs that hook in plugin-registration order.
     * This plugin must stay registered *before* ManifestWriter in
     * `plugins/index.ts`, otherwise the manifest is serialized before the CSS
     * is attached and the styles silently never reach the built extension.
     */
    async generateBundle(_options, bundle) {
      if (config.mode.startsWith('dev')) return

      for (const script of ContentScript.$registers) {
        const output = bundle[`scripts/_${script.moduleName}.js`]

        if (! output) continue

        this.emitFile({
          type: 'prebuilt-chunk',
          fileName: posix.join('scripts', script.path.name + '.js'),
          code: CSPolyfillProd.replace(/__SCRIPT__/g, `"/scripts/_${script.moduleName}.js"`),
        })

        if (output.viteMetadata) {
          script.options.css ??= []
          script.options.css.push(...output.viteMetadata.importedCss)
        }
      }
    }

  }]
})
