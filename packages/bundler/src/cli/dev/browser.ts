import { chromium } from 'playwright-extra'
import stealth from 'puppeteer-extra-plugin-stealth'
import { cwd, type loadAmberConfig } from '../program'
import { join } from 'path'
import type { ViteDevServer } from 'vite'
import type { Session } from './configuration'

type SetupBrowser = {
  config: Awaited<ReturnType<typeof loadAmberConfig>>
  server: ViteDevServer
  session: Session<Partial<{ tabs: string[] }>>
}

export const setup = async (init: SetupBrowser) => {
  const { config, server, session } = init

  chromium.use(stealth())

  const browser = await chromium.launchPersistentContext('.amber/browser/chrome', {
    headless: false,
    viewport: null,
    bypassCSP: config.amber.bypassCSP === true,
    handleSIGHUP: false,
    handleSIGINT: false,
    args: [`--load-extension=${join(cwd, 'dist')}`],
    ignoreDefaultArgs: ['--enable-automation', '--no-sandbox', '--disable-extensions']
  })

  const devPage = `http://localhost:${server.config.server.port}/@amber.js/welcome`

  const tabs = session.data.tabs ??= []

  session.emitter.on('restart', () => {
    tabs.push(... browser.pages().map(it => it.url()))
  })

  tabs.length && tabs.forEach(async (tab, index) => {
    const page = await browser.newPage()

    await page.goto(tab)

    if (index === 0) {
      browser.pages()[0].close()
    }
  })

  if (! tabs.length) {
    browser.newPage()
      .then(page => page.goto(devPage))
      .then(() => browser.pages()[0].close()) // ignore chrome warning
  }

  server.openBrowser = () => { browser.newPage().then(page => page.goto(devPage)) }

  return browser
}