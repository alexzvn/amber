import { defineVitePlugin } from '~/bundler/helper.ts'
import BackgroundScript from '~/bundler/components/BackgroundScript'
import MagicString from "magic-string";

export default  defineVitePlugin(() => {
  const get = (id: string) => {
    return [...BackgroundScript.$registers].find(script => {
      return id.endsWith(script.file) || script.file === id || script.file.endsWith(id)
    })
  }

  let port = 5173

  return {
    name: 'amber:inject-hmr-worker',

    buildStart() {
      
    },

    configureServer({ config }) {
      port = config.server.port || 5173
    },

    transform(code, id) {
      const script = get(id)

      if (script) {
        const magic = new MagicString(code, { filename: script.path.filename })
        magic.prepend(`import '@alexzvn/amber/client/worker.esm';\n`)

        return { code: magic.toString(), map: magic.generateMap() }
      }

      if (id.endsWith('/client/worker.esm.js')) {
        console.warn(id)
        
        code = code.replace(/__HMR_PORT__/g, port.toString())

        return { code }
      }
    }
  }
})