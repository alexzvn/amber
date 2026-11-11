import { spawn, type ChildProcess } from 'child_process'
import { createServer, build, type ViteDevServer, type Rolldown } from 'vite'
import { Option } from 'commander'
import { program } from './program'
import { browsers, type Browser as BrowserTarget } from '~/configure'
import BackgroundScript from '~/components/BackgroundScript'
import { getFirefoxDevMapIIFE, getFirefoxDevMapModule } from '~/components'
import FirefoxDevReload, { createReloadQueue } from '~/plugins/FirefoxDevReload'
import { escapeExecutePath } from '../helper'
import * as Browser from './dev/browser'
import * as Configuration from './dev/configuration'


type DevOption = { devBrowser: boolean, browser: BrowserTarget }

const start = async (option: DevOption) => {
  const { vite, config } = await Configuration.resolveConfig(option.browser)
  const session = new Configuration.Session()
  const firefox = option.browser === 'firefox'

  let server: ViteDevServer | undefined
  const reloads = firefox ? createReloadQueue(() => server) : undefined

  await session.init()

  // Background scripts are built to disk. Firefox content scripts are too: they can
  // only import modules from the extension, so they reload instead of hot-swapping.
  const watch = (input: Record<string, string>, output?: Rolldown.OutputOptions) => build({
    mode: 'development',
    ...vite,
    plugins: [...(vite.plugins ?? []), reloads && FirefoxDevReload(reloads.queue)],
    build: {
      ...vite.build,
      watch: {},
      rollupOptions: {
        ... vite.build!.rollupOptions,
        input,
        output: { ...vite.build!.rollupOptions!.output as Rolldown.OutputOptions, ...output },
      }
    },

    logLevel: 'warn'
  })

  await watch(firefox ? getFirefoxDevMapModule() : BackgroundScript.map)

  for (const [name, file] of Object.entries(firefox ? getFirefoxDevMapIIFE() : {})) {
    await watch({ [name]: file }, { format: 'iife' })
  }

  server = await createServer({ ...vite, configFile: false })
  await server.listen()
  reloads?.listen(server)

  server.printUrls()
  server.bindCLIShortcuts({
    print: true,
    customShortcuts: [
      {
        key: 'e',
        description: 'reload browser extension',
        action(server) {
          server.ws.send({ type: 'custom', event: 'amber:background.reload' })
          server.config.logger.info('Reloading browser extension', { timestamp: true })
        },
      }, {
        key: 'p',
        description: 'reload current tab',
        action(server) {
          server.ws.send({ type: 'custom', event: 'amber:page.reload' })
          server.config.logger.info('Reloading current active tab', { timestamp: true })
        }
      }
    ]
  })

  const browser = option.devBrowser && await Browser.setup({ config, server, session })

  server.restart = async () => {
    session.emitter.emit('restart')

    await server.close()
    browser && await browser.close()
    await session.save()

    process.exit(0xfa)
  }

  return { config: vite, server, manifest: config.manifest, browser }
}

const thread = {
  main: async () => {
    let status: number
    let proc: ChildProcess

    const session = new Configuration.Session()

    await session.init()

    process.on('SIGINT', async () => {
      proc.kill('SIGTERM')
      await new Promise(ok => proc.on('close', ok))

      // cleanup stdin
      process.stdin.setRawMode(true)
      process.stdout.write('\u001b[?25h') // Show cursor
      process.stdout.write('\n') // Move to a new line

      await session.destroy()

      process.exit(0)
    })

    process.stdout.write('\n')

    do {
      const cmd = escapeExecutePath(process.argv[0])
      const argv = process.argv.slice(1).map(escapeExecutePath)

      proc = spawn(cmd, argv, {
        shell: true,
        stdio: [0, 1, 2],
        env: { ...process.env, INTERNAL_DEV_SERVER: 'true' }
      })

      status = await new Promise(ok => proc.on('exit', ok)) || 0

    } while(status === 0xfa)

    await session.destroy()
  },

  child: start
}

program.command('dev')
  .description('Start process to develop browser extension')
  .option('-d, --dev-browser', 'Enable auto development browser (Chrome only)')
  .addOption(new Option('-b, --browser <browser>', 'Target browser').choices(browsers).default('chrome'))
  .action(async (option: DevOption) => {
    if (option.devBrowser && option.browser !== 'chrome') {
      program.error('--dev-browser launches Chromium; for Firefox, load dist/manifest.json from about:debugging')
    }

    const isMainProcess = !process.env.INTERNAL_DEV_SERVER

    process.env.NODE_ENV ??= 'development'

    isMainProcess ? await thread.main() : await thread.child(option)
  })
