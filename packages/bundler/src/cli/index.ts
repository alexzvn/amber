#!/usr/bin/env node --disable-warning=DEP0190
import 'tsx'

import program from './program'
import './dev'
import './build'
import './archive'
import './clean'

program.parse()
