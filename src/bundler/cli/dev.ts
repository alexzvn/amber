import { build, mergeConfig, type UserConfig } from 'vite'
import { program, loadAmberConfig, cwd } from './program'
import { writeManifest } from '~/bundler/ViteExtensionPlugin'
import ProcessIcon from '~/bundler/build/ProcessIcon'
import defu from 'defu'

program.command('dev')
.description('Start process to develop browser extension')
.action(async () => {
  const config = await loadAmberConfig()

  Object.assign(config.manifest, defu(config.manifest, config.devManifest))

  const scripts = config.scripts?.map(cfg => {
    return mergeConfig(cfg, {
      build: { watch: {}, minify: false }
    }) as UserConfig
  })

  const module = config.modules && mergeConfig(config.modules, {
    build: { watch: {}, minify: false }
  })

  if (!module && !scripts) {
    await writeManifest(config.manifest)
  }

  module && await build(module)
  scripts && await Promise.all(scripts.map(build))

  await ProcessIcon(cwd, 'dist')
})