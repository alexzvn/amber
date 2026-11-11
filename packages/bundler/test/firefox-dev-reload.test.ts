import { describe, test, expect, beforeEach } from 'bun:test'
import type { Rolldown } from 'vite'
import BackgroundScript from '../src/components/BackgroundScript'
import ContentScript from '../src/components/ContentScript'
import { detectReload, ReloadQueue } from '../src/plugins/FirefoxDevReload'

type Chunk = { imports?: string[], css?: string[] }

/** Minimal bundle: only the fields `detectReload` reads. */
const bundle = (chunks: Record<string, Chunk>) => {
  const out = {} as Record<string, unknown>

  for (const [file, { imports = [], css = [] }] of Object.entries(chunks)) {
    out[file] = {
      type: 'chunk',
      imports,
      dynamicImports: [],
      viteMetadata: { importedCss: new Set(css), importedAssets: new Set() },
    }
  }

  return out as unknown as Rolldown.OutputBundle
}

beforeEach(() => {
  ContentScript.$registers.length = 0
  BackgroundScript.$registers.clear()
})

describe('detectReload', () => {
  test('module-loaded script: changed shared chunk reloads the tab only', () => {
    new ContentScript('src/content.ts', { matches: ['<all_urls>'] })
    const output = bundle({
      'scripts/_content.js': { imports: ['shared/util.js'] },
      'shared/util.js': {},
    })

    expect(detectReload(output, new Set(['shared/util.js']))).toEqual({ extension: false, tab: true })
  })

  test('content CSS change reloads the extension, not the tab', () => {
    new ContentScript('src/content.ts', { matches: ['<all_urls>'] })
    const output = bundle({ 'scripts/_content.js': { css: ['assets/content.css'] } })

    expect(detectReload(output, new Set(['assets/content.css']))).toEqual({ extension: true, tab: false })
  })

  test('MAIN-world iife change reloads the extension and the tab', () => {
    new ContentScript('src/main.ts', { matches: ['<all_urls>'], world: 'MAIN', format: 'iife' })
    const output = bundle({ 'scripts/main.js': {} })

    expect(detectReload(output, new Set(['scripts/main.js']))).toEqual({ extension: true, tab: true })
  })

  test('background change reloads the extension; tab too only when a MAIN-world script is registered', () => {
    new BackgroundScript('src/background.ts')
    const output = bundle({ 'entries/background.js': { imports: ['shared/util.js'] }, 'shared/util.js': {} })

    expect(detectReload(output, new Set(['shared/util.js']))).toEqual({ extension: true, tab: false })

    new ContentScript('src/main.ts', { matches: ['<all_urls>'], world: 'MAIN', format: 'iife' })
    expect(detectReload(output, new Set(['shared/util.js']))).toEqual({ extension: true, tab: true })
  })

  test('ignores unrelated changes, hotReload off and autoReload off', () => {
    new ContentScript('src/content.ts', { matches: ['<all_urls>'], hotReload: false })
    new BackgroundScript('src/background.ts', { autoReload: false })
    const output = bundle({ 'scripts/_content.js': {}, 'entries/background.js': {}, 'assets/x.png': {} })

    expect(detectReload(output, new Set(['scripts/_content.js', 'entries/background.js', 'assets/x.png']))).toBeUndefined()
  })
})

describe('ReloadQueue', () => {
  const setup = () => {
    const sent: string[] = []
    return { sent, queue: new ReloadQueue(event => sent.push(event)) }
  }

  test('sends a tab reload straight away while the background is connected', () => {
    const { sent, queue } = setup()
    queue.request({ extension: false, tab: true })

    expect(sent).toEqual(['amber:page.reload'])
  })

  test('extension + tab: tab reload waits for the restarted background', () => {
    const { sent, queue } = setup()
    queue.request({ extension: true, tab: true })

    expect(sent).toEqual(['amber:background.reload'])

    queue.connected()
    expect(sent).toEqual(['amber:background.reload', 'amber:page.reload'])
  })

  test('holds requests made during a restart instead of dropping them', () => {
    const { sent, queue } = setup()
    queue.request({ extension: true, tab: false })
    queue.request({ extension: true, tab: false })
    queue.request({ extension: false, tab: true })

    expect(sent).toEqual(['amber:background.reload'])

    queue.connected()
    expect(sent).toEqual(['amber:background.reload', 'amber:background.reload'])

    queue.connected()
    expect(sent).toEqual(['amber:background.reload', 'amber:background.reload', 'amber:page.reload'])

    queue.connected()
    expect(sent).toHaveLength(3)
  })
})
