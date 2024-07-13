import { defineConfig } from 'tsup'
import raw from 'unplugin-raw/esbuild'

export default defineConfig({
  esbuildPlugins: [raw() as any],

  format: 'esm',
  target: 'esnext',
  dts: true,
  clean: true,
  external: ['sharp'],

  entry: {
    bundler: 'src/bundler.ts',
    cli: 'src/cli/index.ts',
    bun: 'src/cli/bun.ts',
    'client/worker.esm': 'src/client/worker.esm.ts',
    'client/worker-bypass-csp.esm': 'src/client/worker-bypass-csp.esm.ts'
  }
})