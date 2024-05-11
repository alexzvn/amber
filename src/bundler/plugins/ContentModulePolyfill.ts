import {defineVitePlugin, mkdir} from '~/bundler/helper.ts'
import type {ViteDevServer} from 'vite'
import {join, dirname} from 'path'
import Page from '~/bundler/components/Page'
import ContentScript from '~/bundler/components/ContentScript'
import CSPolyfillDev from '~/bundler/client/content-script.iife.dev.js?raw'
import CSPolyfillProd from '~/bundler/client/content-script.iife.prod.js?raw'
import fs from "fs/promises"
import {DevServer} from "~/bundler/plugins/BuildEnv.ts";


export default defineVitePlugin(() => {
  let outdir = 'dist'
  let server: ViteDevServer|undefined

  const get = (id: string) => {
    for (const script of ContentScript.$registers) {
      if (id.endsWith(script.file)) {
        return script
      }
    }

    return undefined
  }


  return [{
    name: 'amber:content-module-polyfill',

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
        const code = CSPolyfillDev
          .replace(/__PRE_SCRIPT__/g, `"${host}@vite/client"`)
          .replace(/__SCRIPT__/g, `"${host}${script.file}"`)

        await fs.writeFile(join(outdir, 'scripts', script.path.name + '.js'), code)
      }

      for (const page of Page.$registers) {
        const saveDir = join(outdir, dirname(page.toString()))
        await mkdir(saveDir)
        await fs.writeFile(join(saveDir, page.path.filename!), 'This content is ignored during development')
      }
    },

    async generateBundle(_options, bundle) {
      const saveDir = join(outdir, 'scripts')
      await mkdir(saveDir)

      for (const file in bundle) {
        const script = ContentScript.$registers.find(script => file.endsWith(`/entries/${script.moduleName}.js`))

        if (! script) {
          return
        }

        const code = CSPolyfillProd.replace(/__SCRIPT__/g, `"/entries/${script.moduleName}.js"`)
        await fs.writeFile(join(saveDir, script.path.name + '.js'), code)
      }
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