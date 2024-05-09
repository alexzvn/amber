import { defineVitePlugin } from '~/bundler/helper.ts'
import BackgroundScript from '~/bundler/components/BackgroundScript'
import MagicString from "magic-string";
import type {ViteDevServer} from "vite";
import {DevServer} from '~/bundler/plugins/BuildEnv.ts'
import type {AmberOptions} from '~/bundler/configure.ts'

export default  defineVitePlugin((amber: AmberOptions = {}) => {
  const get = (id: string) => {
    return [...BackgroundScript.$registers].find(script => {
      return id.endsWith(script.file) || script.file === id || script.file.endsWith(id)
    })
  }

  let port = 5173
  let server: ViteDevServer|undefined

  return {
    name: 'amber:inject-hmr-worker',

    buildStart() {
      server ??= DevServer.value
    },

    configureServer(srv) {
      port = srv.config.server.port || 5173
      server = srv
    },

    transform(code, id) {
      const script = get(id)

      if (server && script) {
        const magic = new MagicString(code, { filename: script.path.filename })
        magic.prepend(`import '@alexzvn/amber/client/worker.esm';\n`)

        return { code: magic.toString(), map: magic.generateMap() }
      }

      if (id.endsWith('/client/worker.esm.js')) {
        const magic = new MagicString(code.replace(/__HMR_PORT__/g, port.toString()))

        amber.bypassCSP && magic.prepend('import "./worker-bypass-csp.esm";\n')

        return {
          code: magic.toString(),
          map: magic.generateMap()
        }
      }
    }
  }
})