#!/usr/bin/env node
import 'dotenv/config'
import 'tsx'

import program from './program'
import './dev'
import './build'
import './archive'
import './clean'

program.parse()