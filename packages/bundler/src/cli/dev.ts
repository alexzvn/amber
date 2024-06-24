import { spawn } from 'child_process'
import { mergeConfig, type UserConfig, createServer, build, defineConfig } from 'vite'
import { program, loadAmberConfig, cwd } from './program'
import ProcessIcon from '~/build/ProcessIcon'
import defu from 'defu'
import ContentScript from '~/components/ContentScript'
import BackgroundScript from '~/components/BackgroundScript'
import AmberPlugin from '~/plugins'
import {DevServer} from "~/plugins/BuildEnv.ts"
import { getDevMapModule } from '../components'
import { escapeExecutePath } from '../helper'


const start = async () => {
  const config = await loadAmberConfig()
  Object.assign(config.manifest, defu(config.manifest, config.devManifest))

  let vite: UserConfig = defineConfig({
    plugins: [AmberPlugin(config.manifest, config.amber)],
    build: {
      sourcemap: false,
      minify: false,
      emptyOutDir: false,
      rollupOptions: {
        input: getDevMapModule(),
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
      },
      warmup: {
        clientFiles: [
          ...ContentScript.$registers.map(script => script.file)
        ]
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
  await build({
    ...vite,
    build: {
      ...vite.build,
      watch: {},
      rollupOptions: {
        ... vite.build!.rollupOptions,
        input: BackgroundScript.map,
      }
    },
    logLevel: 'silent'
  })

  await dev.listen()

  dev.printUrls()
  dev.bindCLIShortcuts({
    print: true,
    customShortcuts: [
      {
        key: 'e',
        description: 'reload browser extension',
        action(server) {
          server.hot.send({ type: 'custom', event: 'amber:background.reload' })
          server.config.logger.info('Reloading browser extension', { timestamp: true })
        },
      }, {
        key: 'p',
        description: 'reload current tab',
        action(server) {
          server.hot.send({ type: 'custom', event: 'amber:page.reload' })
          server.config.logger.info('Reloading current active tab', { timestamp: true })
        }
      }
    ],
  })

  await ProcessIcon(cwd, 'dist')

  dev.restart = async () => {
    await dev.close()
    process.exit(0xfa)
  }

  return { config: vite, server: dev, manifest: config.manifest }
}

const thread = {
  main: async () => {
    let status: number

    do {
      const cmd = escapeExecutePath(process.argv[0])
      const argv = process.argv.slice(1).map(escapeExecutePath)

      const proc = spawn(cmd, argv, {
        shell: true,
        stdio: process.platform === 'win32' ? [0, 1, 2] : [0, 0, 0],
        env: { ...process.env, INTERNAL_DEV_SERVER: 'true' }
      })

      status = await new Promise(ok => proc.on('exit', ok)) || 0

    } while(status === 0xfa)
  },

  child: start
}

program.command('dev')
  .description('Start process to develop browser extension')
  .action(async () => {
    const isMainProcess = !process.env.INTERNAL_DEV_SERVER

    process.env.NODE_ENV ??= 'development'

    if (isMainProcess) {
      console.log('\n\tStarting amber development...\n')
    }

    isMainProcess ? await thread.main() : await thread.child()
  })