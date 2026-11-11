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
  const warnings: string[] = []
  await plugin.generateBundle.call({
    emitFile: (file: { fileName: string, code: string }) => { emitted[file.fileName] = file.code },
    warn: (message: string) => warnings.push(message)
  }, {}, bundle)

  return { emitted, warnings }
}

describe('ContentModulePolyfill: production loader', () => {
  test('chrome (default) imports the module by extension-root path', async () => {
    new ContentScript('src/content/isolated.ts', { matches: ['<all_urls>'] })

    const { emitted, warnings } = await emitLoaders()

    expect(emitted['scripts/isolated.js']).toContain('import("/scripts/_isolated.js")')
    expect(warnings).toEqual([])
  })

  test('firefox resolves isolated-world modules against the extension origin', async () => {
    new ContentScript('src/content/isolated.ts', { matches: ['<all_urls>'] })

    const { emitted, warnings } = await emitLoaders({ browser: 'firefox' })

    expect(emitted['scripts/isolated.js']).toContain('import(chrome.runtime.getURL("/scripts/_isolated.js"))')
    expect(warnings).toEqual([])
  })

  test('firefox warns that es-format MAIN-world scripts need iife', async () => {
    new ContentScript('src/content/main.ts', { matches: ['<all_urls>'], world: 'MAIN' })

    const { emitted, warnings } = await emitLoaders({ browser: 'firefox' })

    expect(emitted['scripts/main.js']).not.toContain('chrome.runtime')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("format: 'iife'")
  })

  test('chrome does not warn for MAIN-world scripts', async () => {
    new ContentScript('src/content/main.ts', { matches: ['<all_urls>'], world: 'MAIN' })

    const { warnings } = await emitLoaders()

    expect(warnings).toEqual([])
  })
})
