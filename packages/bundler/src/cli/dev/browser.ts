import { chromium } from 'playwright-extra'
import stealth from 'puppeteer-extra-plugin-stealth'
import { cwd, type loadAmberConfig } from '../program'
import { join } from 'path'
import type { ViteDevServer } from 'vite'


export const setup = async (config: Awaited<ReturnType<typeof loadAmberConfig>>, server: ViteDevServer) => {
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

  browser.newPage()
    .then(page => page.goto(devPage))
    .then(() => browser.pages()[0].close()) // ignore chrome warning

  server.openBrowser = () => { browser.newPage().then(page => page.goto(devPage)) }

  return browser
}