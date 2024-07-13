import { defineConfig } from 'tsup'
import pkg from './package.json'

const now = new Date()

const banner = `/**
 * ${pkg.name} v${pkg.version}
 * (c) ${now.getFullYear()} Alex (Doan)
 * @license MIT
 */`

export default defineConfig({
  format: ['cjs', 'esm'],
  target: 'esnext',
  dts: true,
  clean: true,

  entry: ['src/index.ts'],
  banner: { js: banner }
})