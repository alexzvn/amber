#!/usr/bin/env node
import 'tsx'
import 'dotenv/config'

import program from './program'
import './dev'
import './build'
import './archive'
import './clean'
import { create } from './create'

program.command('create <project-name>')
  .description('Create extension project power by Vite')
  .action(create)

program.parse()