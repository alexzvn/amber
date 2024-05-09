import { Command } from 'commander'
import { create } from '../bundler/cli/create'
import { version, name } from './package.json'

const program = new Command()
  .name(name)
  .description('Create amber project')
  .version(version)
  .argument('<project-name>', 'Provide a name for your project')
  .action(create)

program.parse()