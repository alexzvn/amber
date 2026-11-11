import { describe, test, expect, beforeEach } from 'bun:test'
import ContentModulePolyfill from '../src/plugins/ContentModulePolyfill'
import ContentScript from '../src/components/ContentScript'
import type { PluginOptions } from '../src/configure'

beforeEach(() => {
  ContentScript.$registers.length = 0
})

type LoaderHooks = {
  configResolved(config: unknown): void
  generateBundle(this: unknown, options: unknown, bundle: unknown): Promise<void>
}

const emitLoaders = async (amber?: PluginOptions) => {
  // Vite types hooks as ObjectHook unions; the test calls the plain function hooks directly.
  const [plugin] = ContentModulePolyfill(amber) as unknown as LoaderHooks[]
  plugin.configResolved({ mode: 'production', build: { outDir: 'dist' } })

  const bundle = Object.fromEntries(
    ContentScript.$registers.map(script => [`scripts/_${script.moduleName}.js`, {}])
  )

  const emitted: Record<string, string> = {}
  await plugin.generateBundle.call({
    emitFile: (file: { fileName: string, code: string }) => { emitted[file.fileName] = file.code }
  }, {}, bundle)

  return emitted
}

describe('ContentModulePolyfill: production loader', () => {
  test('chrome (default) imports the module by extension-root path', async () => {
    new ContentScript('src/content/isolated.ts', { matches: ['<all_urls>'] })

    const emitted = await emitLoaders()

    expect(emitted['scripts/isolated.js']).toContain('import("/scripts/_isolated.js")')
  })

  test('firefox resolves isolated-world modules against the extension origin', async () => {
    new ContentScript('src/content/isolated.ts', { matches: ['<all_urls>'] })

    const emitted = await emitLoaders({ browser: 'firefox' })

    expect(emitted['scripts/isolated.js']).toContain('import(chrome.runtime.getURL("/scripts/_isolated.js"))')
  })

  test('firefox MAIN-world scripts keep the plain path (no chrome.runtime there)', async () => {
    new ContentScript('src/content/main.ts', { matches: ['<all_urls>'], world: 'MAIN' })

    const emitted = await emitLoaders({ browser: 'firefox' })

    expect(emitted['scripts/main.js']).toContain('import("/scripts/_main.js")')
    expect(emitted['scripts/main.js']).not.toContain('chrome.runtime')
  })
})
