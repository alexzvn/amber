#!/usr/bin/env node
import 'dotenv/config'

import program from './program'
import './dev'
import './build'
import './archive'
import './clean'

console.log(process.env);


// Detect if running in Bun or Node.js
const isBun = typeof Bun !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

if (isBun) {
  console.log('Running in Bun');
  // Bun-specific code here
} else if (isNode) {
  console.log('Running in Node.js');
  // Node.js-specific code here
} else {
  console.error('Unsupported environment');
}

program.parse()