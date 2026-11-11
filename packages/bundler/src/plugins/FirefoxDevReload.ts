import { createHash } from 'node:crypto'
import type { Plugin, Rolldown, ViteDevServer } from 'vite'
import BackgroundScript from '~/components/BackgroundScript'
import ContentScript from '~/components/ContentScript'

/**
 * Firefox dev reloads, decided once a watch rebuild is written to disk. Firefox
 * content scripts may only `import()` modules from the extension (bug 1803950),
 * so `amber dev --browser firefox` builds content scripts, like the background,
 * to disk and reloads instead of hot-swapping.
 *
 * - Module-loaded content scripts: the declared stub is fixed and Firefox re-reads
 *   the imported module on navigation, so reloading the tab picks up the rebuild.
 * - Background scripts, content CSS and MAIN-world iife scripts need an extension
 *   reload (Firefox caches declared files until then). Firefox then re-injects
 *   declared scripts and CSS into open tabs: isolated-world copies are torn down
 *   with the old extension, but a MAIN-world script's globals stay in the page,
 *   so when hot-reloaded MAIN-world scripts exist the tab reloads afterwards.
 */
export type Reload = { extension: boolean, tab: boolean }

/** Sent by the dev background client whenever its socket (re)opens. */
export const BACKGROUND_CONNECTED = 'amber:background.connected'

type OutputBundle = Rolldown.OutputBundle

const fingerprint = (output: Rolldown.OutputChunk | Rolldown.OutputAsset) => {
  return createHash('sha1')
    .update(output.type === 'chunk' ? output.code : output.source)
    .digest('hex')
}

/** Files an entry chunk depends on at runtime, split by kind. */
const closure = (bundle: OutputBundle, entry: string) => {
  const js = new Set<string>()
  const css = new Set<string>()
  const stack = [entry]

  while (stack.length) {
    const file = stack.pop()!
    const output = bundle[file]

    if (js.has(file) || output?.type !== 'chunk') continue

    js.add(file)
    stack.push(...output.imports, ...output.dynamicImports)
    output.viteMetadata?.importedCss.forEach((file: string) => css.add(file))
  }

  return { js, css }
}

export const detectReload = (bundle: OutputBundle, changed: Set<string>): Reload | undefined => {
  const reload: Reload = { extension: false, tab: false }
  const touched = (files: Set<string>) => [...files].some(file => changed.has(file))

  for (const script of BackgroundScript.$registers) {
    const entry = `entries/${script.path.name}.js`

    if (script.options.autoReload && touched(closure(bundle, entry).js)) {
      reload.extension = true
    }
  }

  for (const script of ContentScript.$registers) {
    if (! script.options.hotReload) continue

    const name = script.moduleName
    const moduleLoaded = `scripts/_${name}.js` in bundle
    const { js, css } = closure(bundle, moduleLoaded ? `scripts/_${name}.js` : `scripts/${name}.js`)

    if (touched(css) || (! moduleLoaded && touched(js))) {
      reload.extension = true
    }

    if (touched(js)) {
      reload.tab = true
    }
  }

  const mainWorld = ContentScript.$registers.some(script => {
    return script.options.hotReload && script.options.world === 'MAIN'
  })

  reload.tab ||= reload.extension && mainWorld

  return reload.extension || reload.tab ? reload : undefined
}

/**
 * Delivers reloads to the dev background client. While the background restarts
 * it is not connected, so anything requested meanwhile is held and sent once
 * it reports `amber:background.connected`; an extension reload sends its tab
 * reload the same way.
 */
export class ReloadQueue {
  private restarting = false
  private pending: Reload = { extension: false, tab: false }

  constructor(private readonly send: (event: 'amber:background.reload' | 'amber:page.reload') => void) {}

  request(reload: Reload) {
    this.pending.extension ||= reload.extension
    this.pending.tab ||= reload.tab

    this.restarting || this.flush()
  }

  connected() {
    this.restarting = false
    this.flush()
  }

  private flush() {
    if (this.pending.extension) {
      this.pending.extension = false
      this.restarting = true
      this.send('amber:background.reload')
    } else if (this.pending.tab) {
      this.pending.tab = false
      this.send('amber:page.reload')
    }
  }
}

/** One per `amber dev` run: every watch pass shares it, and with it the restart state. */
export const createReloadQueue = (getServer: () => ViteDevServer | undefined) => {
  const queue = new ReloadQueue(event => {
    const server = getServer()

    server?.config.logger.info(
      event === 'amber:page.reload' ? 'Reloading current tab' : 'Reloading extension',
      { timestamp: true }
    )

    server?.ws.send({ type: 'custom', event })
  })

  return {
    queue,
    listen: (server: ViteDevServer) => server.ws.on(BACKGROUND_CONNECTED, () => queue.connected()),
  }
}

export default (queue: ReloadQueue): Plugin => {
  const previous = new Map<string, string>()
  let initial = true

  return {
    name: 'amber:firefox-dev-reload',

    writeBundle(_options, bundle) {
      const changed = new Set<string>()

      for (const [file, output] of Object.entries(bundle)) {
        const hash = fingerprint(output)

        previous.get(file) !== hash && changed.add(file)
        previous.set(file, hash)
      }

      if (initial) {
        initial = false
        return
      }

      const reload = detectReload(bundle, changed)

      reload && queue.request(reload)
    }
  }
}
