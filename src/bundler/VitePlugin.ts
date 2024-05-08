import { createWriteStream } from 'fs'
import fs from 'fs/promises'
import MagicString from 'magic-string'
import { join, relative, dirname } from 'path'
import { mkdir } from  './helper'
import type {PluginOption} from 'vite'
import { BackgroundScript, ContentScript } from './bundler'
import { invokeOnce } from './helper'
import { cwd } from './cli/program'

type ExtOption = {
  /**
   * @default false
   */
  dev: boolean
  
  /**
   * @default dist
   */
  outdir: string
}


export const writeManifest = async (manifest: Record<any, unknown>, options: Partial<ExtOption> = {}) => {
  const { outdir = 'dist' } = options

  await mkdir(outdir)

  const data = JSON.stringify(manifest, null, 2)
  createWriteStream(join(outdir, 'manifest.json')).end(data)
}

export const createFileStream = async (filepath: string) => {
  dirname(filepath) && await mkdir(dirname(filepath))

  return createWriteStream(filepath)
}

export default (manifest: Record<any, unknown>, options: Partial<ExtOption> = {}): PluginOption => {
  const dev = options.dev

  const matchBackgroundFile = (id: string|((script: BackgroundScript) => boolean)) => {
    if (!id) {
      return false
    }

    const items = [... BackgroundScript.$registers.values()]

    return typeof id === 'string'
      ? items.some(script => id.endsWith(script.file))
      : items.some(id)
  }

  const saveManifest = invokeOnce(() => writeManifest(manifest, options))


  return [
    {
    name: 'amber:main',
    enforce: 'pre',

    transform(code, id) {
      if (id.endsWith('/dist/hot/client-reload-helper.js')) {
        return {
          code: code.replace(/__RELOAD_EVENT_URL__/g, `"http://localhost:5173"`)
        }
      }

      if (ContentScript.$registers.some(script => id.endsWith(script.file.replace(/\//g, '-')))) {
        const magic = new MagicString(code)
        return {
          code: magic.prepend(`import '@vite/client'\n`).toString(),
          map: magic.generateMap({ file: id })
        }
      }

      if (!dev || !matchBackgroundFile(id)) {
        return
      }

      const magic = new MagicString(code, { filename: id })

      return {
        code: magic.prepend(`import '@alexzvn/amber/hot/client-reload-helper'\n`).toString(),
        map: magic.generateMap()
      }
    },

    transformIndexHtml: (code, ctx) => {
      const magic = new MagicString(code, { filename: ctx.filename })

      const inject = `\n<script type="module" src="http://localhost:5173/@vite/client"></script>\n`

      magic.appendRight(code.indexOf('<head>') + '<head>'.length, inject)

      return magic.toString()
    },

    writeBundle: async (opts, bundle) => {
      const isMatchBackgroundScript = Object.values(bundle).some((output: any) => {
        return matchBackgroundFile(output.facadeModuleId)
      })

      // isMatchBackgroundScript && broadcast()
      await saveManifest()
    }
  }]
}