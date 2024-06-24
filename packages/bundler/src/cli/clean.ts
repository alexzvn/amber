import { program, cwd } from './program'
import fs from 'fs/promises'
import {join} from 'path'

const check = async () => {
  try {
    await fs.access(join(cwd, 'amber.config.ts'))
      .catch(() => fs.access(join(cwd, 'amber.config.js')))
  } catch (e) {
    console.error('Amber config not found')
    process.exit(1)
  }
}

const clean = {
  dist: () => fs.rm(join(cwd, 'dist'), { recursive: true, force: true }),
  amber: () => fs.rm(join(cwd, '.amber'), { recursive: true, force: true }),
}

program.command('clean')
  .description('Clean output folder')
  .action(async () => {
    await check().then(clean.dist)
  })

program.command('cleanup')
  .description('Clean up everything')
  .action(async () => {
    await check().then(clean.dist).then(clean.amber)
  })