import { Command } from 'commander'
import prompts from 'prompts'
import { create } from './create'
import { version, name } from '../package.json'
import { FRAMEWORKS, FrameworkVariant } from './vite'

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

    const { framework } = await prompts({
      type: 'select', name: 'framework',
      message: 'Select a framework:',
      choices: FRAMEWORKS.map(item => {
        return { title: item.color(item.display), value: item.variants }
      })
    })

    const { template } = await prompts({
      type: 'select', name: 'template',
      message: 'Select a variants:',
      choices: framework.map((item: FrameworkVariant) => {
        return { title: item.color(item.display), value: item.name }
      })
    })

    if (folder) {
      await create({ folder, devBrowser, template })
    }
  })

program.parse()
