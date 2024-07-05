import { defineConfig } from 'tsup'
import raw from 'unplugin-raw/esbuild'


export default defineConfig({
  esbuildPlugins: [raw() as any],

  format: 'esm',
  target: 'esnext',
  dts: false,
  clean: true,
  external: ['sharp'],

  entry: ['command.ts']
})