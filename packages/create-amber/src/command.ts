import { Command } from 'commander'
import prompts from 'prompts'
import { create, type CreateAmber } from './create'
import { version, name } from '../package.json'

const program = new Command()
  .name(name)
  .description('Create amber project')
  .version(version)
  .action(async () => {
    console.clear()

    const answer = await prompts([
      { type: 'text', name: 'folder', message: 'Project name:', initial: 'amber-project' },
      { type: 'confirm', name: 'devBrowser', message: 'Use isolated chromium browser for development?', initial: true }
    ])

    answer.folder && await create(answer satisfies CreateAmber)
  })

program.parse()
