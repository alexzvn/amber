#!/usr/bin/env node
import 'tsx'
import 'dotenv/config'
import { build } from 'vite'
import { join } from 'path'
import type { DefinedConfig } from '~/development/configurate.ts'
import ProcessIcon from '~/development/build/ProcessIcon'

const cwd = process.cwd()

const start = async () => {
  const config = await import(join(cwd, 'amber.config.ts'))
    .then(mod => mod.default as DefinedConfig)

  config.modules && await build(config.modules)
  config.scripts && await Promise.all(config.scripts.map(build))

  await ProcessIcon(cwd, 'dist')
}

start().then(() => console.log('Finished'))