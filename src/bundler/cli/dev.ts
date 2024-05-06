import { build, mergeConfig, type UserConfig } from 'vite'
import { program, loadAmberConfig, cwd } from './program'
import { writeManifest } from '~/bundler/ViteExtensionPlugin'
import ProcessIcon from '~/bundler/build/ProcessIcon'
import { server } from '~/bundler/hot/server'
import { watchFile } from 'fs'
import defu from 'defu'


const start = async () => {
  const config = await loadAmberConfig()

  Object.assign(config.manifest, defu(config.manifest, config.devManifest))

  config.manifest.host_permissions ??= []
  config.manifest.host_permissions.push('ws://localhost:4321/*')

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

  const watcherModule: any = module && await build(module)
  const watcherScripts: any[] = scripts ? await Promise.all(scripts.map(build)) : []

  return () => {
    watcherModule?.close()
    watcherScripts.map(it => it.close())
  }
}

program.command('dev')
.description('Start process to develop browser extension')
.action(async () => {
  program.dev = true
  server.listen(4321, '0.0.0.0')

  let stop = await start()

  watchFile('amber.config.ts', { persistent: true }, async () => {
    stop()
    stop = await start()
  })

  await ProcessIcon(cwd, 'dist')
})