import { defineConfig } from 'tsup'
import raw from 'unplugin-raw/esbuild'

export default defineConfig({
  esbuildPlugins: [raw()]
})