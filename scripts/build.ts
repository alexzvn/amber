import { $ } from 'bun'
import pkg from '../package.json'

await $`rm -rf dist`
await $`npx tsup-node src/bundler/bundler.ts src/bundler/cli/index.ts --format esm --dts --target ES2022`

pkg.types = 'bundler.d.ts'
pkg.main = 'bundler.js'
pkg.bin = { amber: 'cli/index.js' }