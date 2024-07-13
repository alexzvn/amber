import { Command } from 'commander'
import { version } from '~/../package.json'
import { join } from 'path'
import { pathToFileURL } from 'url'
import type { DefinedConfig } from '~/configure'
import { exists } from '~/helper'
import { tsImport } from 'tsx/esm/api'

export const cwd = process.cwd()

const read = async (file: string) => {
  try {
    return await import(file)
  } catch (e) {

    // @ts-ignore
    if (e.code === 'ERR_UNKNOWN_FILE_EXTENSION') {
      return await tsImport(file, import.meta.url)
    }

    throw e
  }
}

export const loadAmberConfig = async () => {
  const configs = [
    'amber.config.ts',
    'amber.config.js',
  ]

  for (const file of configs) {
    if (await exists(file)) {
      const mod = await read(pathToFileURL(join(cwd, file)).toString())
      return mod.default as DefinedConfig
    }
  }

  throw new Error('Amber config not found')
}

export const program = new Command('amber')
  .description('Amber CLI for building browser chrome extension')
  .version(version) 

export default program