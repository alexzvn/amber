import {defineVitePlugin, invokeOnce, mkdir} from '~/bundler/helper.ts'
import { parse } from 'node-html-parser'
import { hash } from '~/bundler/helper'
import { join } from 'path'
import fs from 'fs/promises'
import type {ResolvedConfig} from 'vite'


export default defineVitePlugin(() => {

  const inline = new Map<string, string>()
  let config: ResolvedConfig

  return {
    name: 'amber:inline-script-polyfill',

    configResolved: cfg => { config = cfg },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);

        for (const [id, code] of inline.entries()) {
          if (! url.pathname.endsWith(`shared/inline-${id}.js`)) {
            continue
          }
          res.writeHead(200, { 'Content-Type': 'text/javascript' })

          return res.write(code, () => res.end())
        }

        next()
      })
    },

    async transformIndexHtml(code) {
      const root = parse(code)

      // inline script are not allowed in extension
      const scripts = root.querySelectorAll('script:not([src])')

      for (const script of scripts) {
        if (! script.textContent.trim()) {
          continue
        }

        const id = hash(script.textContent).toString(16)
        !inline.has(id) && inline.set(id, script.textContent)

        script.textContent = ''
        script.setAttribute('src', join('/', 'shared', `inline-${id}.js`))
      }

      return root.toString()
    },

    async writeBundle() {
      const outdir = join(config.build.outDir, 'shared')
      await mkdir(outdir)

      for (const [id, code] of inline.entries()) {
        const filename = `inline-${id}.js`
        await fs.writeFile(join(outdir, filename), code)
      }
    }
  }
})