import { build, mergeConfig, type UserConfig,defineConfig } from 'vite'
import { program, loadAmberConfig, cwd } from './program'
import { writeManifest } from '~/bundler/VitePlugin'
import ProcessIcon from '~/bundler/build/ProcessIcon'
import defu from "defu";
import AmberPlugin from '~/bundler/plugins'
import ContentScript from '~/bundler/components/ContentScript'
import Page from '~/bundler/components/Page'
import BackgroundScript from '~/bundler/components/BackgroundScript'

program.command('build')
.description('Start process to build browser extension')
.option('-p, --prod, --production', 'Build extension in production mode')
.option('--minify', 'Minify the source code')
.option('-s, --sourcemap [mode]', 'Save the source map')
.option('-w, --watch', 'Enter watch mode')
.action(async (options) => {
  const config = await loadAmberConfig()

  const watch = options.watch ? {} : undefined
  const minify = options.prod || options.minify
  const sourcemap: boolean = options.sourcemap ? options.sourcemap : false

  const inputs = {} as Record<string, string>

  for (const script of ContentScript.$registers) {
    inputs[script.moduleName] = script.file
  }

  for (const page of Page.$registers) {
    inputs[page.path.name!] = page.file
  }

  for (const script of BackgroundScript.$registers) {
    inputs[script.path.name!] = script.file
  }

  let vite: UserConfig = defineConfig({
    plugins: [AmberPlugin(config.manifest)],
    build: {
      sourcemap,
      minify,
      watch,
      emptyOutDir: false,
      rollupOptions: {
        input: inputs,
        output: {
          entryFileNames: 'entries/[name].js',
          chunkFileNames: 'shared/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      }
    }
  })

  await build(mergeConfig(vite, config.vite))
  await ProcessIcon(cwd, 'dist')
})