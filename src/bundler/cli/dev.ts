import { mergeConfig, type UserConfig, createServer, build, defineConfig } from 'vite'
import { program, loadAmberConfig, cwd } from './program'
import { writeManifest } from '~/bundler/VitePlugin'
import ProcessIcon from '~/bundler/build/ProcessIcon'
import defu from 'defu'
import ContentScript from '~/bundler/components/ContentScript'
import Page from '~/bundler/components/Page'
import BackgroundScript from '~/bundler/components/BackgroundScript'
import AmberPlugin from '~/bundler/plugins'
import {DevServer} from "~/bundler/plugins/BuildEnv.ts";


const start = async () => {
  const config = await loadAmberConfig()
  Object.assign(config.manifest, defu(config.manifest, config.devManifest))

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

  await dev.listen()
  dev.printUrls()
  dev.bindCLIShortcuts()
}

program.command('dev')
.description('Start process to develop browser extension')
.action(async () => {
  program.dev = true

  await start()

  await ProcessIcon(cwd, 'dist')
})