import {defineVitePlugin, mkdir} from '~/bundler/helper.ts'
import type {ViteDevServer} from 'vite'
import {dirname, join} from 'path'
import ContentScript from '~/bundler/components/ContentScript'
import ContentScriptIIFE from '~/bundler/client/content-script.iife.js?raw'
import MagicString from "magic-string"
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

    buildStart() {
      server ??= DevServer.value
    },

    async transform(code, id) {
      const script = get(id)

      if (! script) {
        return
      }

      const host = server ? `http://localhost:${server.config.server.port}/` : ''

      const fill = {
        prescript: host ? `"${host}@vite/client"` : '(void 0)',
        script: host ? `"${host}${script.file}"` :`"/entries/${script.moduleName}.js"`
      }

      const polyfill = ContentScriptIIFE
        .replace(/__PRE_SCRIPT__/g, fill.prescript)
        .replace(/__SCRIPT__/g, fill.script)

      const saveDir = join(outdir, 'scripts')
      await mkdir(saveDir)

      await fs.writeFile(join(saveDir, script.path.name + '.js'), polyfill)

      return { code }
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