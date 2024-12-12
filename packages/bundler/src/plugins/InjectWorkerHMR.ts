import { defineVitePlugin } from '~/helper'
import BackgroundScript from '~/components/BackgroundScript'
import MagicString from "magic-string"
import type {GeneralManifest} from '~/browsers/manifest.ts'
import type {ViteDevServer} from 'vite'
import {DevServer} from '~/plugins/BuildEnv.ts'
import type {AmberOptions} from '~/configure'
import LoaderScript from '~/client/__loader?raw'
import fs from 'fs/promises'
import { join } from 'path'

export default  defineVitePlugin((manifest: GeneralManifest, amber: AmberOptions = {}) => {
  const get = (id: string) => {
    return [...BackgroundScript.$registers].find(script => {
      return id.endsWith(script.file) || script.file === id || script.file.endsWith(id)
    })
  }

  let port = 5173
  let loader = '/entries/__loader.js'
  let server: ViteDevServer|undefined

  return {
    name: 'amber:inject-hmr-worker',

    buildStart() {
      server ??= DevServer.value
    },

    configResolved() {
      if (! amber.bypassCSP) {
        return
      }

      const hosts = new Set(Array.isArray(amber.bypassCSP) ? amber.bypassCSP : [
        amber.bypassCSP === true ? '<all_urls>' : amber.bypassCSP
      ])

      manifest.host_permissions?.forEach(host => hosts.add(host))
      manifest.host_permissions = [...hosts]
    },

    configureServer(srv) {
      port = srv.config.server.port || 5173
      server = srv

      srv.httpServer?.addListener('listening', () => {
        port = srv.config.server.port || 5173
      })
    },

    async writeBundle() {
      if (server) {
        const loaderPath = join(server?.config.build.outDir || 'dist', loader)
        await fs.writeFile(loaderPath, LoaderScript)
      }
    },

    transform(code, id) {
      const script = get(id)

      if (server && script) {
        const magic = new MagicString(code, { filename: script.path.filename })
        magic.prepend(`import '@amber.js/bundler/client/worker.esm';\n`)

        return { code: magic.toString(), map: magic.generateMap() }
      }

      if (id.endsWith('/client/worker.esm.mjs')) {
        const script = [... BackgroundScript.$registers][0]

        code = code
          .replace(/__HMR_PORT__/g, port.toString())
          .replace(/__SCRIPT__/g,  script?.file ? `"${script.file}"` : '(void 0)')
          .replace(/VITE_URL/g, `http://localhost:${port}`)
          .replace(/LOADER_SCRIPT/g, loader)

        const magic = new MagicString(code)

        amber.bypassCSP && magic.prepend('import "./worker-bypass-csp.esm";\n')

        return {
          code: magic.toString(),
          map: magic.generateMap()
        }
      }
    },

    async handleHotUpdate({ file, server, read }) {
      const graph = server.moduleGraph
      const [module] = (graph.getModulesByFile(file) || new Set)

      if (!module) {
        return
      }

      const impacts = new Set<string|null>([file])
      const stack = [... module.importers]
      const scripts = [...BackgroundScript.$registers]
        .filter(script => script.options.autoReload)
        .map(script => script.file)

      while (stack.length) {
        const mod = stack.pop()!

        if (impacts.has(mod.id)) continue

        impacts.add(mod.id)
        stack.push(...mod.importers)
      }

      const isMatch = [...impacts].some(id => {
        return scripts.some(script => id?.endsWith(script))
      })

      if (! isMatch) return

      await read()

      // wait for other vite process build background script
      setTimeout(() => {
        server.config.logger.info('Reloaded Browser extension', {
          timestamp: true
        })

        server.hot.send({
          type: 'custom',
          event: 'amber:background.reload',
        })
      }, 500)
    }
  }
})