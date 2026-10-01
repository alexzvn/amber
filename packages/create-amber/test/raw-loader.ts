// Bun test preload: teaches Bun's module resolver how to load the `?raw`
// suffixed imports that `unplugin-raw` (the esbuild plugin used by tsup) turns
// into inlined string literals at build time. Without this, `bun test` can't
// resolve `./template/*.template?raw` imports used by src/create.ts.
import { plugin } from 'bun'
import { dirname, isAbsolute, resolve } from 'path'
import { readFile } from 'fs/promises'

plugin({
  name: 'raw-loader',
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, (args) => {
      const clean = args.path.replace(/\?raw$/, '')
      const base = args.importer ? dirname(args.importer) : process.cwd()
      const resolved = isAbsolute(clean) ? clean : resolve(base, clean)

      return { path: `${resolved}?raw`, namespace: 'raw' }
    })

    build.onLoad({ filter: /\?raw$/, namespace: 'raw' }, async (args) => {
      const clean = args.path.replace(/\?raw$/, '')
      const contents = await readFile(clean, 'utf8')

      return { contents: `export default ${JSON.stringify(contents)}`, loader: 'js' }
    })
  },
})
