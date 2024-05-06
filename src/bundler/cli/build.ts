import { build, mergeConfig, type UserConfig } from 'vite'
import { program, loadAmberConfig, cwd } from './program'
import { writeManifest } from '~/bundler/ViteExtensionPlugin'
import ProcessIcon from '~/bundler/build/ProcessIcon'

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
  const sourcemap = options.sourcemap ? options.sourcemap : false

  const scripts = config.scripts?.map(cfg => {
    return mergeConfig(cfg, {
      build: { watch, minify, sourcemap }
    }) as UserConfig
  })

  const module = config.modules && mergeConfig(config.modules, {
    build: { watch, minify, sourcemap }
  })

  if (!module && !scripts) {
    await writeManifest(config.manifest)
  }

  module && await build(module)
  scripts && await Promise.all(scripts.map(build))

  await ProcessIcon(cwd, 'dist')
})