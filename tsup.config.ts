import { defineConfig } from 'tsup'
import raw from 'unplugin-raw/esbuild'
import pkg from './package.json'
import {createWriteStream} from 'fs'
import { cp } from 'fs/promises'

export default defineConfig({
  esbuildPlugins: [raw()],

  format: 'esm',
  target: 'esnext',
  dts: true,
  clean: true,
  external: ['sharp'],

  onSuccess: async () => {
    pkg.types = 'index.d.ts'
    pkg.main = 'index.js'
    pkg.module = 'index.js'
    pkg.bin = { amber: 'cli.js' }

    createWriteStream('dist/package.json').end(JSON.stringify(pkg, null, 2))
    return cp('README.md', 'dist/README.md')
  },

  esbuildOptions(options, context) {
    options.external ??= []
    options.external.push('sharp')
  },

  entry: {
    bundler: 'src/bundler/bundler.ts',
    index: 'src/amber/index.ts',
    cli: 'src/bundler/cli/index.ts',
    'client/worker.esm': 'src/bundler/client/worker.esm.ts',
    'client/worker-bypass-csp.esm': 'src/bundler/client/worker-bypass-csp.esm.ts'
  }
})