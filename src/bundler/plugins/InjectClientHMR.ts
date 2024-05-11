import {defineVitePlugin, mkdir} from '~/bundler/helper.ts'
import MagicString from 'magic-string'
import {DevServer} from '~/bundler/plugins/BuildEnv.ts'
import { parse } from 'node-html-parser'
import { hash } from '~/bundler/helper'
import { dirname, join } from 'path'
import fs from 'fs/promises'
import type {ViteDevServer} from 'vite'

export default defineVitePlugin(() => {
  let server: ViteDevServer

  const mapInlineScript = new Map<string, string>()

  const saveInlineScript = async (id: string, code: string, path: string) => {
    if (mapInlineScript.has(id)) {
      return
    }

    await mkdir(dirname(path))
    await fs.writeFile(path, code)

    mapInlineScript.set(id, code)
  }

  return {
    name: 'amber:inject-hmr-client',
    enforce: 'post',

    buildStart() {
      server ??= DevServer.value!
    },

    configureServer(_server) {
      server = _server

      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);

        for (const [id, code] of mapInlineScript.entries()) {
          if (! url.pathname.endsWith(id)) {
            continue
          }

          res.writeHead(200, { 'Content-Type': 'text/javascript' })

          return res.write(code, () => res.end())
        }

        next()
      })
    },

    async transformIndexHtml(code) {
      if (!server) {
        return code
      }

      const root = parse(code)

      // inline script are not allowed in extension
      const inlineScripts = root.querySelectorAll('script:not([src])')

      for (const script of inlineScripts) {
        if (! script.textContent.trim()) {
          continue
        }

        const filename = `${hash(script.textContent).toString(16)}.js`
        const id = join('shared', filename)
        const location = join(server.config.build.outDir || 'dist', id)

        await saveInlineScript(id, script.textContent, location)

        script.textContent = ''
        script.setAttribute('src', join('/', 'shared', filename))
      }

      return root.toString()
    }
  }
})