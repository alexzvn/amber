import { Command } from 'commander'
import prompts from 'prompts'
import { create } from '../bundler/src/cli/create'
import { version, name } from './package.json'

const program = new Command()
  .name(name)
  .description('Create amber project')
  .version(version)
  .action(async () => {
    console.clear()

    const answer = await prompts({
      type: 'text',
      name: 'folder',
      message: 'Project name:',
      initial: 'amber-project'
    })

    answer.folder && await create(answer.folder)
  })

program.parse()
