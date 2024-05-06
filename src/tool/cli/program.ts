import { Command } from 'commander'
import { version } from '~/../package.json'
import { join } from 'path'
import type { DefinedConfig } from '~/tool/configure'

export const cwd = process.cwd()

export const loadAmberConfig = async () => await import(join(cwd, 'amber.config.ts'))
  .then(mod => mod.default as DefinedConfig)

export const program = new Command('amber')
  .version(version)
  .description('Amber CLI for building browser chrome extension')

export default program