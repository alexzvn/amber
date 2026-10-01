import { describe, test, expect, beforeEach } from 'bun:test'
import ManifestWriter from '../src/plugins/ManifestWriter'
import BackgroundScript from '../src/components/BackgroundScript'
import type { GeneralManifest } from '../src/browsers/manifest'

beforeEach(() => {
  BackgroundScript.$registers.clear()
})

const baseManifest = (): GeneralManifest => ({
  manifest_version: 3,
  name: 'Example',
  version: '1.0.0'
})

describe('ManifestWriter: config() web_accessible_resources merge', () => {
  test('creates a fresh <all_urls> entry with shared/* and scripts/* when none exists', () => {
    const manifest = baseManifest()
    const plugin = ManifestWriter(manifest)

    // @ts-expect-error minimal vite plugin hook invocation
    plugin.config()

    expect(manifest.web_accessible_resources).toEqual([
      { matches: ['<all_urls>'], resources: ['shared/*', 'scripts/*'] }
    ])
  })

  test('merges shared/* and scripts/* into an existing <all_urls> entry, deduping resources', () => {
    const manifest = baseManifest()
    manifest.web_accessible_resources = [
      { matches: ['<all_urls>'], resources: ['scripts/*', 'icons/*'] }
    ]
    const plugin = ManifestWriter(manifest)

    // @ts-expect-error minimal vite plugin hook invocation
    plugin.config()

    expect(manifest.web_accessible_resources).toEqual([
      { matches: ['<all_urls>'], resources: ['scripts/*', 'icons/*', 'shared/*'] }
    ])
  })

  test('leaves a non-<all_urls> entry alone and appends a new <all_urls> entry', () => {
    const manifest = baseManifest()
    manifest.web_accessible_resources = [
      { matches: ['https://example.com/*'], resources: ['foo.js'] }
    ]
    const plugin = ManifestWriter(manifest)

    // @ts-expect-error minimal vite plugin hook invocation
    plugin.config()

    expect(manifest.web_accessible_resources).toEqual([
      { matches: ['https://example.com/*'], resources: ['foo.js'] },
      { matches: ['<all_urls>'], resources: ['shared/*', 'scripts/*'] }
    ])
  })
})

describe('ManifestWriter: configResolved() dev-only setup', () => {
  test('is a no-op outside dev mode (no background injected, no host permission added)', () => {
    const manifest = baseManifest()
    const plugin = ManifestWriter(manifest)

    plugin.configResolved?.({
      mode: 'production',
      server: { port: 5173 }
      // @ts-expect-error partial ResolvedConfig fixture
    })

    expect(manifest.background).toBeUndefined()
    expect(manifest.host_permissions).toBeUndefined()
  })

  test('in dev mode, adds the dev-server host permission and web_accessible <all_urls>/* entry', () => {
    const manifest = baseManifest()
    manifest.web_accessible_resources = []
    const plugin = ManifestWriter(manifest)

    plugin.configResolved?.({
      mode: 'development',
      server: { port: 5173 }
      // @ts-expect-error partial ResolvedConfig fixture
    })

    expect(manifest.host_permissions).toEqual(['http://localhost:5173/*'])
    expect(manifest.web_accessible_resources).toEqual([
      { matches: ['<all_urls>'], resources: ['/*'] }
    ])
  })

  test('in dev mode, injects the bundled worker.esm background script only when the manifest has none', () => {
    const manifest = baseManifest()
    manifest.web_accessible_resources = []
    const plugin = ManifestWriter(manifest)

    plugin.configResolved?.({
      mode: 'development',
      server: { port: 5173 }
      // @ts-expect-error partial ResolvedConfig fixture
    })

    expect(manifest.background).toBeInstanceOf(BackgroundScript)
    expect((manifest.background as BackgroundScript).file).toBe('@amber.js/bundler/client/worker.esm')
  })

  test('in dev mode, does not override an author-provided background declaration', () => {
    const manifest = baseManifest()
    manifest.web_accessible_resources = []
    const existingBackground = new BackgroundScript('src/worker/custom.ts')
    manifest.background = existingBackground
    const plugin = ManifestWriter(manifest)

    plugin.configResolved?.({
      mode: 'development',
      server: { port: 5173 }
      // @ts-expect-error partial ResolvedConfig fixture
    })

    expect(manifest.background).toBe(existingBackground)
  })

  test('in dev mode with amber.bypassCSP set, adds the declarativeNetRequest permission', () => {
    const manifest = baseManifest()
    manifest.web_accessible_resources = []
    const plugin = ManifestWriter(manifest, { bypassCSP: true })

    plugin.configResolved?.({
      mode: 'development',
      server: { port: 5173 }
      // @ts-expect-error partial ResolvedConfig fixture
    })

    expect(manifest.permissions).toEqual(['declarativeNetRequest'])
  })

  test('setup runs only once across repeated dev configResolved calls (invokeOnce)', () => {
    const manifest = baseManifest()
    manifest.web_accessible_resources = []
    const plugin = ManifestWriter(manifest)

    plugin.configResolved?.({
      mode: 'development',
      server: { port: 5173 }
      // @ts-expect-error partial ResolvedConfig fixture
    })
    plugin.configResolved?.({
      mode: 'development',
      server: { port: 6000 }
      // @ts-expect-error partial ResolvedConfig fixture
    })

    expect(manifest.host_permissions).toEqual(['http://localhost:5173/*'])
  })
})

describe('ManifestWriter: generateBundle() manifest.json emission', () => {
  test('emits a manifest.json asset containing the pretty-printed manifest', () => {
    const manifest = baseManifest()
    const plugin = ManifestWriter(manifest)

    const emitted: Array<{ fileName: string, type: string, source: string }> = []
    const context = { emitFile: (file: typeof emitted[number]) => emitted.push(file) }

    plugin.generateBundle?.call(context as never, {} as never, {} as never, false)

    expect(emitted).toHaveLength(1)
    expect(emitted[0].fileName).toBe('manifest.json')
    expect(JSON.parse(emitted[0].source)).toEqual(manifest)
  })

  test('deduplicates host_permissions before writing the manifest', () => {
    const manifest = baseManifest()
    manifest.host_permissions = ['http://localhost:5173/*', 'http://localhost:5173/*']
    const plugin = ManifestWriter(manifest)

    const emitted: Array<{ fileName: string, type: string, source: string }> = []
    const context = { emitFile: (file: typeof emitted[number]) => emitted.push(file) }

    plugin.generateBundle?.call(context as never, {} as never, {} as never, false)

    expect(JSON.parse(emitted[0].source).host_permissions).toEqual(['http://localhost:5173/*'])
  })
})
