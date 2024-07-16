import { spawn } from 'child_process'
import { mergeConfig, type UserConfig, createServer, build, defineConfig, type ViteDevServer, type CLIShortcut } from 'vite'
import { program, loadAmberConfig, cwd } from './program'
import ProcessIcon from '~/build/ProcessIcon'
import defu from 'defu'
import ContentScript from '~/components/ContentScript'
import BackgroundScript from '~/components/BackgroundScript'
import AmberPlugin from '~/plugins'
import {DevServer} from "~/plugins/BuildEnv.ts"
import { getDevMapModule } from '../components'
import { escapeExecutePath } from '../helper'
import dotenv from 'dotenv'
import { chromium } from 'playwright'
import { join } from 'path'

type DevOption = { devBrowser: boolean }

const start = async (option: DevOption) => {
  dotenv.config({ override: true })

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

  const shortcuts: CLIShortcut<ViteDevServer>[] = [
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
  ]

  await ProcessIcon(cwd, 'dist')

  dev.restart = async () => {
    await dev.close()
    process.exit(0xfa)
  }

  const extensionPath = join(cwd, 'dist')

  const browser = option.devBrowser && await chromium.launchPersistentContext('.amber/browser/chrome', {
    headless: false,
    viewport: null,
    args: [`--load-extension=${extensionPath}`],
    ignoreDefaultArgs: ['--enable-automation', '--no-sandbox', '--disable-extensions']
  })

  if (browser) {
    const devPage = `http://localhost:${dev.config.server.port}`

    shortcuts.push({
      key: 'd',
      description: 'open in development browser',
      action: () => { browser.newPage().then(page => page.goto(devPage)) }
    })
  }

  dev.bindCLIShortcuts({ print: true, customShortcuts: shortcuts })

  return { config: vite, server: dev, manifest: config.manifest, browser }
}

const thread = {
  main: async () => {
    let status: number

    do {
      const cmd = escapeExecutePath(process.argv[0])
      const argv = process.argv.slice(1).map(escapeExecutePath)

      const proc = spawn(cmd, argv, {
        shell: true,
        stdio: [0, 1, 2],
        env: { ...process.env, INTERNAL_DEV_SERVER: 'true' }
      })

      status = await new Promise(ok => proc.on('exit', ok)) || 0

    } while(status === 0xfa)

    console.log()
  },

  child: start
}

program.command('dev')
  .description('Start process to develop browser extension')
  .option('-d, --dev-browser', 'Disable auto development browser')
  .action(async (option: DevOption) => {
    const isMainProcess = !process.env.INTERNAL_DEV_SERVER

    process.env.NODE_ENV ??= 'development'

    if (isMainProcess) {
      console.log('\n\tStarting amber development...\n')
    }

    isMainProcess ? await thread.main() : await thread.child(option)
  })