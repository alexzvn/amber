import { build, mergeConfig, type UserConfig, defineConfig } from 'vite'
import { program, loadAmberConfig, cwd } from './program'
import ProcessIcon from '~/bundler/build/ProcessIcon'
import AmberPlugin from '~/bundler/plugins'
import ContentScript from '~/bundler/components/ContentScript'
import Page from '~/bundler/components/Page'
import BackgroundScript from '~/bundler/components/BackgroundScript'
import { getMapIIFE, getMapModule } from '~/bundler/components/'
import { exists } from '~/bundler/helper'
import { join } from 'path'
import fs from 'fs/promises'

program.command('build')
.description('Start process to build browser extension')
.option('-p, --prod, --production', 'Build extension in production mode')
.option('-c, --clean', 'Clean dist folder before build', true)
.option('-m, --minify', 'Minify the source code')
.option('-s, --sourcemap [mode]', 'Save the source map')
.option('-w, --watch', 'Enter watch mode')
.action(async (options) => {
  process.env.NODE_ENV ??= 'production'

  const config = await loadAmberConfig()
  const outDir = join(cwd, config.vite.build?.outDir || 'dist')

  if (options.clean && await exists(outDir)) {
    await fs.rm(outDir, { recursive: true, force: true })
  }

  const watch = options.watch ? {} : undefined
  const minify = options.prod || options.minify
  const sourcemap: boolean = options.sourcemap ? options.sourcemap : false

  const modules: UserConfig = defineConfig({
    plugins: [AmberPlugin(config.manifest)],
    build: {
      sourcemap,
      minify,
      watch,
      emptyOutDir: false,
      rollupOptions: {
        input: getMapModule(),
        output: {
          entryFileNames: 'entries/[name].js',
          chunkFileNames: 'shared/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      }
    }
  })

  const mapIIFE = getMapIIFE()

  const iife: UserConfig = defineConfig({
    plugins: [AmberPlugin(config.manifest)],
    build: {
      sourcemap,
      minify,
      watch,
      emptyOutDir: false,
      rollupOptions: {
        input: mapIIFE,
        output: {
          format: 'iife',
          entryFileNames: 'entries/[name].js',
          chunkFileNames: 'shared/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      }
    }
  })

  await build(mergeConfig(modules, config.vite))
  Object.keys(mapIIFE).length && await build(mergeConfig(iife, config.vite))

  await ProcessIcon(cwd, 'dist')
})