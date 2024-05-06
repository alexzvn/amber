import { build, mergeConfig, type UserConfig } from 'vite'
import { program, loadAmberConfig, cwd } from './program'
import { writeManifest } from '~/ViteExtensionPlugin'
import ProcessIcon from '~/tool/build/ProcessIcon'

program.command('dev')
.description('Start process to develop browser extension')
.action(async () => {
  const config = await loadAmberConfig()

  const scripts = config.scripts?.map(cfg => {
    return mergeConfig(cfg, {
      build: { watch: {} }
    }) as UserConfig
  })

  const module = config.modules && mergeConfig(config.modules, {
    build: { watch: {} }
  })

  if (!module && !scripts) {
    await writeManifest(config.manifest)
  }

  module && await build(module)
  scripts && await Promise.all(scripts.map(build))

  await ProcessIcon(cwd, 'dist')
})