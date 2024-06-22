import { spawn } from 'child_process'
import { mergeConfig, type UserConfig, createServer, build, defineConfig } from 'vite'
import { program, loadAmberConfig, cwd } from './program'
import ProcessIcon from '~/bundler/build/ProcessIcon'
import defu from 'defu'
import ContentScript from '~/bundler/components/ContentScript'
import BackgroundScript from '~/bundler/components/BackgroundScript'
import AmberPlugin from '~/bundler/plugins'
import {DevServer} from "~/bundler/plugins/BuildEnv.ts"
import { getDevMapModule } from '../components'


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
      const proc = spawn(process.argv[0], [... process.argv.slice(1), '--fork'], {
        shell: true,
        stdio: process.platform === 'win32' ? [0, 1, 2] : [0, 0, 0],
        env: process.env
      })

      status = await new Promise(ok => proc.on('exit', ok)) || 0

    } while(status === 0xfa)
  },

  child: start
}

program.command('dev')
  .description('Start process to develop browser extension')
  .option('--fork', 'This is internal args', false)
  .action(async (opt: { fork: boolean }) => {
    process.env.NODE_ENV ??= 'development'

    opt.fork ? await thread.child() : await thread.main()
  })