import { Command } from 'commander'
import { version } from '~/../package.json'
import { join } from 'path'
import type { DefinedConfig } from '~/bundler/configure'
import { exists } from '~/bundler/helper'

export const cwd = process.cwd()

export const loadAmberConfig = async () => {
  const configs = [
    'amber.config.ts',
    'amber.config.js',
  ]

  for (const file of configs) {
    if (await exists(file)) {
      const mod = await import(join(cwd, file) + '?' + Date.now())
      return mod.default as DefinedConfig
    }
  }

  throw new Error('Amber config not found')
}

export const program = new Command('amber')
  .description('Amber CLI for building browser chrome extension')
  .version(version) as Command & { dev: boolean }

export default program