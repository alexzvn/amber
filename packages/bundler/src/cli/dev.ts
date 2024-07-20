import { spawn, type ChildProcess } from 'child_process'
import { createServer, build } from 'vite'
import { program, cwd } from './program'
import BackgroundScript from '~/components/BackgroundScript'
import {DevServer} from "~/plugins/BuildEnv.ts"
import { escapeExecutePath } from '../helper'
import { randomBytes } from 'crypto'
import * as Browser from './dev/browser'
import * as Configuration from './dev/configuration'


type DevOption = { devBrowser: boolean }

const start = async (option: DevOption) => {
  const { vite, config } = await Configuration.resolveConfig()
  const server = await createServer({ ...vite, configFile: false })
  const session = new Configuration.Session()

  await session.init()

  DevServer.value = server
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

  await server.listen()

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
  .option('-d, --dev-browser', 'Disable auto development browser')
  .action(async (option: DevOption) => {
    const isMainProcess = !process.env.INTERNAL_DEV_SERVER

    process.env.NODE_ENV ??= 'development'

    isMainProcess ? await thread.main() : await thread.child(option)
  })