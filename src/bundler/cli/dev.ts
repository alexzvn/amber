import { build, mergeConfig, type UserConfig } from 'vite'
import { program, loadAmberConfig, cwd } from './program'
import { writeManifest } from '~/bundler/ViteExtensionPlugin'
import ProcessIcon from '~/bundler/build/ProcessIcon'
import { server } from '~/bundler/hot/server'
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

  const watcherModule = module && [await build(module)].flat() as any[]
  const watcherScripts: any[] = scripts ? await Promise.all(scripts.map(build)) : []

  return () => {
    // this not working, fix later
    watcherModule?.map(it => it.close())
    watcherScripts.map(it => it.close())
  }
}

program.command('dev')
.description('Start process to develop browser extension')
.action(async () => {
  program.dev = true
  server.listen(4321, '0.0.0.0')

  const _stop = await start()

  await ProcessIcon(cwd, 'dist')
})