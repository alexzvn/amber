import { program, cwd } from './program'
import fs from 'fs/promises'
import {join} from "path";

program.command('clean')
  .description('Clean output folder')
  .action(async () => {
    try {
      await fs.access(join(cwd, 'amber.config.ts'))
        .catch(() => fs.access(join(cwd, 'amber.config.js')))
    } catch (e) {
      console.error('Amber config not found')
      process.exit(1)
    }

    await fs.rm(join(cwd, 'dist'), {
      recursive: true, force: true
    })
  })