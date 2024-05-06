import { createWriteStream } from 'fs'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import type {PluginOption} from 'vite'
import { BackgroundScript } from './bundler'
import { broadcast, connections } from './hot/server'
import fs from 'fs/promises'

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

  const matchBackgroundFile = (id: string|((script: BackgroundScript) => boolean)) => {
    const items = [... BackgroundScript.$registers.values()]
    
    return typeof id === 'string'
      ? items.some(script => script.file === id)
      : items.some(id)
  }

  return {
    name: 'ViteExtension',

    watchChange(id) {
      console.log(matchBackgroundFile(script => id.endsWith(script.file)));

      if (!matchBackgroundFile(script => id.endsWith(script.file))) {
        return
      }

      setTimeout(() => broadcast('reload-extension'), 1_000)
    },

    writeBundle: async () => {
      writeManifest(manifest, options)
    }
  }
}