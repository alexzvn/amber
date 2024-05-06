import { Command } from 'commander'
import { version } from '~/../package.json'
import { join } from 'path'
import type { DefinedConfig } from '~/bundler/configure'

export const cwd = process.cwd()

export const loadAmberConfig = async () => await import(join(cwd, 'amber.config.ts'))
  .then(mod => mod.default as DefinedConfig)

export const program = new Command('amber')
  .description('Amber CLI for building browser chrome extension')
  .version(version) as Command & { dev: boolean }

export default program