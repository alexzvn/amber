import { describe, test, expect, beforeEach } from 'bun:test'
import ManifestWriter from '../src/plugins/ManifestWriter'
import BackgroundScript from '../src/components/BackgroundScript'
import { toFirefoxManifest, hasGeckoId } from '../src/browsers/firefox'
import type { GeneralManifest } from '../src/browsers/manifest'
import type { PluginOptions } from '../src/configure'

beforeEach(() => {
  BackgroundScript.$registers.clear()
})

const baseManifest = (): GeneralManifest => ({
  manifest_version: 3,
  name: 'Example',
  version: '1.0.0'
})

const generate = (manifest: GeneralManifest, amber?: PluginOptions) => {
  const plugin = ManifestWriter(manifest, amber)

  const emitted: Array<{ fileName: string, type: string, source: string }> = []
  const warnings: string[] = []
  const context = {
    emitFile: (file: typeof emitted[number]) => emitted.push(file),
    warn: (message: string) => warnings.push(message)
  }

  const run = () => plugin.generateBundle?.call(context as never, {} as never, {} as never, false)

  return { run, emitted, warnings }
}

describe('toFirefoxManifest', () => {
  test('converts background.service_worker into background.scripts, keeping type', () => {
    const output = toFirefoxManifest({
      background: { service_worker: 'entries/worker.js', type: 'module' }
    })

    expect(output.background).toEqual({ scripts: ['entries/worker.js'], type: 'module' })
  })

  test('preserves existing background.scripts and drops service_worker', () => {
    const output = toFirefoxManifest({
      background: { service_worker: 'entries/worker.js', scripts: ['entries/other.js'], type: 'module' }
    })

    expect(output.background).toEqual({ scripts: ['entries/other.js'], type: 'module' })
  })

  test('removes use_dynamic_url from every web_accessible_resources entry', () => {
    const output = toFirefoxManifest({
      web_accessible_resources: [
        { matches: ['<all_urls>'], resources: ['shared/*'], use_dynamic_url: true },
        { matches: ['https://example.com/*'], resources: ['foo.js'] }
      ]
    })

    expect(output.web_accessible_resources).toEqual([
      { matches: ['<all_urls>'], resources: ['shared/*'] },
      { matches: ['https://example.com/*'], resources: ['foo.js'] }
    ])
  })

  test('maps side_panel.default_path to sidebar_action.default_panel and drops sidePanel permission', () => {
    const output = toFirefoxManifest({
      side_panel: { default_path: 'pages/panel.html' },
      permissions: ['storage', 'sidePanel'],
      optional_permissions: ['sidePanel']
    })

    expect(output.side_panel).toBeUndefined()
    expect(output.sidebar_action).toEqual({ default_panel: 'pages/panel.html' })
    expect(output.permissions).toEqual(['storage'])
    expect(output.optional_permissions).toEqual([])
  })

  test('does not overwrite an author-provided sidebar_action', () => {
    const output = toFirefoxManifest({
      side_panel: { default_path: 'pages/panel.html' },
      sidebar_action: { default_panel: 'pages/firefox.html', default_title: 'Mine' }
    })

    expect(output.side_panel).toBeUndefined()
    expect(output.sidebar_action).toEqual({ default_panel: 'pages/firefox.html', default_title: 'Mine' })
  })

  test('does not mutate the input manifest', () => {
    const input = {
      background: { service_worker: 'entries/worker.js', type: 'module' },
      side_panel: { default_path: 'pages/panel.html' },
      permissions: ['sidePanel'],
      web_accessible_resources: [{ matches: ['<all_urls>'], resources: ['a'], use_dynamic_url: true }]
    }
    const snapshot = structuredClone(input)

    toFirefoxManifest(input)

    expect(input).toEqual(snapshot)
  })

  test('hasGeckoId reports browser_specific_settings.gecko.id presence', () => {
    expect(hasGeckoId({})).toBe(false)
    expect(hasGeckoId({ browser_specific_settings: { gecko: {} } })).toBe(false)
    expect(hasGeckoId({ browser_specific_settings: { gecko: { id: 'ext@example.com' } } })).toBe(true)
  })
})

describe('ManifestWriter: browser target', () => {
  test('chrome (default and explicit) output equals the pretty-printed live manifest', () => {
    const create = () => {
      const manifest = baseManifest()
      manifest.background = new BackgroundScript('src/background.ts')
      manifest.side_panel = { default_path: 'pages/panel.html' }
      manifest.permissions = ['sidePanel']
      manifest.web_accessible_resources = [{ matches: ['<all_urls>'], resources: ['a'], use_dynamic_url: true }]
      return manifest
    }

    for (const amber of [undefined, {}, { browser: 'chrome' } as const]) {
      const manifest = create()
      const { run, emitted, warnings } = generate(manifest, amber)

      run()

      expect(emitted).toHaveLength(1)
      expect(emitted[0].source).toBe(JSON.stringify(manifest, null, 2))
      expect(JSON.parse(emitted[0].source).background).toEqual({ service_worker: 'entries/background.js', type: 'module' })
      expect(warnings).toEqual([])
    }
  })

  test('firefox output uses background.scripts for a BackgroundScript component', () => {
    const manifest = baseManifest()
    manifest.background = new BackgroundScript('src/background.ts')
    const { run, emitted } = generate(manifest, { browser: 'firefox' })

    run()

    const output = JSON.parse(emitted[0].source)
    expect(emitted[0].fileName).toBe('manifest.json')
    expect(output.background).toEqual({ scripts: ['entries/background.js'], type: 'module' })
    expect(output.background.service_worker).toBeUndefined()
  })

  test('firefox output strips use_dynamic_url and maps side_panel', () => {
    const manifest = baseManifest()
    manifest.side_panel = { default_path: 'pages/panel.html' }
    manifest.permissions = ['storage', 'sidePanel']
    manifest.web_accessible_resources = [{ matches: ['<all_urls>'], resources: ['a'], use_dynamic_url: true }]
    const { run, emitted } = generate(manifest, { browser: 'firefox' })

    run()

    const output = JSON.parse(emitted[0].source)
    expect(output.web_accessible_resources).toEqual([{ matches: ['<all_urls>'], resources: ['a'] }])
    expect(output.side_panel).toBeUndefined()
    expect(output.sidebar_action).toEqual({ default_panel: 'pages/panel.html' })
    expect(output.permissions).toEqual(['storage'])
  })

  test('firefox warns about a missing gecko id, once per manifest', () => {
    const manifest = baseManifest()
    const first = generate(manifest, { browser: 'firefox' })
    const second = generate(manifest, { browser: 'firefox' })

    first.run()
    second.run()

    expect(first.warnings).toHaveLength(1)
    expect(first.warnings[0]).toContain('browser_specific_settings.gecko.id')
    expect(second.warnings).toEqual([])
  })

  test('firefox does not warn when the gecko id is set', () => {
    const manifest = baseManifest()
    manifest.browser_specific_settings = { gecko: { id: 'ext@example.com' } }
    const { run, emitted, warnings } = generate(manifest, { browser: 'firefox' })

    run()

    expect(warnings).toEqual([])
    expect(JSON.parse(emitted[0].source).browser_specific_settings).toEqual({ gecko: { id: 'ext@example.com' } })
  })

  test('firefox leaves the shared manifest untouched across both build passes', () => {
    const manifest = baseManifest()
    const background = new BackgroundScript('src/background.ts')
    manifest.background = background
    manifest.side_panel = { default_path: 'pages/panel.html' }
    manifest.permissions = ['sidePanel']
    manifest.web_accessible_resources = [{ matches: ['<all_urls>'], resources: ['a'], use_dynamic_url: true }]
    const before = JSON.stringify(manifest, null, 2)

    // build.ts creates a plugin per pass (modules + iife) over the same config.manifest
    const modules = generate(manifest, { browser: 'firefox' })
    const iife = generate(manifest, { browser: 'firefox' })

    modules.run()
    iife.run()

    expect(manifest.background).toBe(background)
    expect(JSON.stringify(manifest, null, 2)).toBe(before)
    expect(iife.emitted[0].source).toBe(modules.emitted[0].source)
    expect(JSON.parse(iife.emitted[0].source).background).toEqual({ scripts: ['entries/background.js'], type: 'module' })
  })
})
