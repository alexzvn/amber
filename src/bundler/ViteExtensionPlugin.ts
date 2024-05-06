import { createWriteStream } from 'fs'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import type {PluginOption} from 'vite'
import { BackgroundScript } from './bundler'
import { broadcast } from './hot/server'
import { invokeOnce } from './helper'

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

const createOutputDirectory = async (path: string) => {
  try {
    return await mkdir(path)
  } catch {
    // shhhhh
  }
}

export const writeManifest = async (manifest: Record<any, unknown>, options: Partial<ExtOption> = {}) => {
  const { outdir = 'dist' } = options

  await createOutputDirectory(outdir)

  const data = JSON.stringify(manifest, null, 2)
  createWriteStream(join(outdir, 'manifest.json')).end(data)
}

export default (manifest: Record<any, unknown>, options: Partial<ExtOption> = {}): PluginOption => {
  const dev = options.dev

  const matchBackgroundFile = (id: string|((script: BackgroundScript) => boolean)) => {
    const items = [... BackgroundScript.$registers.values()]

    return typeof id === 'string'
      ? items.some(script => id.endsWith(script.file))
      : items.some(id)
  }

  const saveManifest = invokeOnce(() => writeManifest(manifest, options))

  return {
    name: 'ViteExtension',

    transform(code, id) {
      if (!dev || !matchBackgroundFile(id)) {
        return
      }

      const inject = "import '@alexzvn/amber/hot/client-reload-helper'\n"

      return {
        code: inject + code
      }
    },

    writeBundle: async (opts, bundle) => {
      const isMatchBackgroundScript = Object.values(bundle).some((output: any) => {
        return matchBackgroundFile(output.facadeModuleId)
      })

      isMatchBackgroundScript && broadcast('reload-extension')
      await saveManifest()
    }
  }
}