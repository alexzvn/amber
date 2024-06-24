import { defineConfig } from 'tsup'

export default defineConfig({
  format: ['cjs', 'esm'],
  target: 'esnext',
  dts: true,
  clean: true,

  entry: ['src/index.ts']
})