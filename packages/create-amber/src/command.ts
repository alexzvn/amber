import { Command } from 'commander'
import prompts from 'prompts'
import { create } from './create'
import { version, name } from '../package.json'

const program = new Command()
  .name(name)
  .description('Create amber project')
  .version(version)
  .argument('[folder]', 'Your project name folder')
  .action(async (folder?: string) => {

    folder ??= await prompts({
      type: 'text',
      name: 'folder',
      message: 'Project name:',
      initial: 'amber-project'
    }).then(it => it.folder)

    const { devBrowser } = await prompts({
      type: 'confirm', name: 'devBrowser',
      message: 'Use isolated chromium browser for development?',
      initial: true
    })

    if (folder) {
      await create({ folder, devBrowser })
    }
  })

program.parse()
