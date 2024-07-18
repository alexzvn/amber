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

    async handleHotUpdate({ file, server, modules }) {
      type Modules = typeof modules

      const scripts = Object.values(BackgroundScript.map)
      const has = (id: string) => scripts.some(name => id.endsWith(name))

      const checkWorkerDeps = (modules: Modules): boolean => {
        for (const mod of modules) {
          if (has(mod.file || mod.id || mod.url)) {
            return true
          }
        }

        return false
      }

      const isMatch = has(file) || checkWorkerDeps(modules)

      isMatch && server.hot.send({
        type: 'custom',
        event: 'amber:background.reload',
      })

      setTimeout(() => {
        isMatch && server.config.logger.info('Reloaded Browser extension', {
          timestamp: true
        })
      }, 500)
    },
  }
})