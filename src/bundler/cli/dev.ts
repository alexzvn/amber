import { mergeConfig, type UserConfig, createServer, build, defineConfig } from 'vite'
import { program, loadAmberConfig, cwd } from './program'
import ProcessIcon from '~/bundler/build/ProcessIcon'
import defu from 'defu'
import ContentScript from '~/bundler/components/ContentScript'
import Page from '~/bundler/components/Page'
import BackgroundScript from '~/bundler/components/BackgroundScript'
import AmberPlugin from '~/bundler/plugins'
import {DevServer} from "~/bundler/plugins/BuildEnv.ts";
import { pick } from '~/bundler/helper'


const start = async () => {
  const config = await loadAmberConfig()
  Object.assign(config.manifest, defu(config.manifest, config.devManifest))

  const inputs = {
    ...ContentScript.map,
    ...BackgroundScript.map,
    ...Page.map,
  } as Record<string, string>

  let vite: UserConfig = defineConfig({
    plugins: [AmberPlugin(config.manifest, config.amber)],
    build: {
      sourcemap: false,
      minify: false,
      emptyOutDir: false,
      rollupOptions: {
        input: inputs,
        output: {
          entryFileNames: 'entries/[name].js',
          chunkFileNames: 'shared/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      }
    },
    server: {
      host: 'localhost',
      port: 5173,
      hmr: {
        host: 'localhost',
        port: 5173
      },
      watch: {
        ignored: ['**/dist/**']
      }
    }
  })

  vite = mergeConfig(vite, config.vite);
  Object.assign(vite.server!.hmr as any, {
    host: vite.server!.host,
    port: vite.server!.port
  })

  const dev = await createServer({ ...vite, configFile: false })

  
  DevServer.value = dev
  await build(vite)
  await build({
    ...vite,
    build: {
      ...vite.build,
      watch: {},
      rollupOptions: {
        ... vite.build!.rollupOptions,
        input: BackgroundScript.map,
      }
    }
  })


  await dev.listen()
  dev.printUrls()
  dev.bindCLIShortcuts()

  return { config: vite, server: dev, manifest: config.manifest }
}

program.command('dev')
.description('Start process to develop browser extension')
.action(async () => {
  program.dev = true

  const { server, config, manifest } = await start()

  server.watcher.on('change', async (file) => {
    /\.env$/.test(file) && await build(config)
  })

  server.watcher.on('change', async file => {
    if (! /amber\.config\.ts/.test(file)) {
      return
    }

    const _config = await loadAmberConfig()

    Object.assign(_config.manifest, _config.devManifest)
    Object.assign(manifest, _config.manifest)

    await build(config)
  })

  await ProcessIcon(cwd, 'dist')
})