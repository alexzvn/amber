import { createWriteStream } from 'fs'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import type {PluginOption} from 'vite'

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
  return {
    name: 'ViteExtension',

    writeBundle: async () => writeManifest(manifest, options)
  }
}