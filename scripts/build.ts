import { $ } from 'bun'
import pkg from '../package.json'

const scripts = [
  'src/bundler/bundler.ts',
  'src/bundler/cli/index.ts',
  'src/bundler/client/worker.esm.ts',
]

await $`rm -rf dist`

pkg.types = 'bundler.d.ts'
pkg.main = 'bundler.js'
pkg.bin = { amber: 'cli/index.js' }

Bun.write(Bun.file('dist/package.json'), JSON.stringify(pkg, null, 2))

await $`npx tsup-node ${scripts} --format esm --dts --target ES2022 ${process.argv.slice(2)}`