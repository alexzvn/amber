#!/usr/bin/env node
import 'tsx'
import 'dotenv/config'

import program from './program'
import './dev'
import './build'
import './archive'

program.parse()