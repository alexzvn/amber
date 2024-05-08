import { defineVitePlugin } from '~/bundler/helper.ts'
import MagicString from "magic-string";
import {DevServer} from "~/bundler/plugins/BuildEnv.ts";


export default defineVitePlugin(() => {
  let server: unknown

  return {
    name: 'amber:inject-hmr-client',

    buildStart() {
      server ??= DevServer.value
    },

    transformIndexHtml(code) {
      if (!server) {
        return
      }

      const target = '<head>'
      const magic = new MagicString(code)
      const inject = `\n<script type="module" src="/@vite/client"></script>\n`

      return magic.appendRight(code.indexOf(target) + target.length, inject).toString()
    }
  }
})