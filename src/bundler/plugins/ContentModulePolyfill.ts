import {defineVitePlugin, mkdir} from '~/bundler/helper.ts'
import type {ViteDevServer} from 'vite'
import {join, dirname} from 'path'
import Page from '~/bundler/components/Page'
import ContentScript from '~/bundler/components/ContentScript'
import CSPolyfillDev from '~/bundler/client/content-script.iife.dev.js?raw'
import CSPolyfillProd from '~/bundler/client/content-script.iife.prod.js?raw'
import fs from "fs/promises"
import {DevServer} from "~/bundler/plugins/BuildEnv.ts"
import type { AmberOptions } from '../configure'


export default defineVitePlugin((amber: AmberOptions = {}) => {
  let outdir = 'dist'
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
        const script = ContentScript.$registers.find(script => chunk.facadeModuleId?.endsWith(script.file))

        return script ? 'scripts/_[name].js' : 'entries/[name].js'
      }
    },

    configResolved(cfg) {
      outdir = cfg.build.outDir
    },

    configureServer(_server) {
      server = _server 
    },

    async buildStart() {
      server ??= DevServer.value

      if (! server) {
        return
      }

      await mkdir(join(outdir, 'scripts'))
      const host = `http://localhost:${server.config.server.port}/`

      for (const script of ContentScript.$registers) {
        const enableReload = amber.autoReloadPage ?? false
        const code = CSPolyfillDev
          .replace(/__PRE_SCRIPT__/g, `"${host}@vite/client"`)
          .replace(/__SCRIPT__/g, `"${host}${script.file}"`)
          .replace(/__ALLOW_FULL_RELOAD__/g, enableReload.toString())

        await fs.writeFile(join(outdir, 'scripts', script.path.name + '.js'), code)
      }

      for (const page of Page.$registers) {
        const saveDir = join(outdir, dirname(page.toString()))
        await mkdir(saveDir)
        await fs.writeFile(join(saveDir, page.path.filename!), 'This content is ignored during development')
      }
    },

    transform(_code, id) {
      if (!id.includes('/vite/dist/client/client')) {
        return
      }

      const lines = _code.split('\n')
      const reloadLine = lines.findIndex((line) => line.includes(`case 'full-reload':`))
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

    async generateBundle(_options, bundle) {
      const saveDir = join(outdir, 'scripts')
      await mkdir(saveDir)

      Object.keys(bundle).map(async file => {
        const script = ContentScript.$registers.find(script => file.endsWith(`scripts/_${script.moduleName}.js`))

        if (! script) {
          return
        }

        const code = CSPolyfillProd.replace(/__SCRIPT__/g, `"/scripts/_${script.moduleName}.js"`)
        await fs.writeFile(join(saveDir, script.path.name + '.js'), code)
      })
    },

    writeBundle(opt, bundles) {
      for (const script of ContentScript.$registers) {
        const bundle = bundles['entries/' + script.moduleName + '.js'] as any

        if (!bundle || !bundle.viteMetadata) {
          return
        }

        script.options.css ??= []
        script.options.css.push(...bundle!.viteMetadata.importedCss)
      }
    }
  }]
})