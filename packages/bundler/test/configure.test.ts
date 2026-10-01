import { describe, test, expect } from 'bun:test'
import { defineConfig } from '../src/configure'
import type { GeneralManifest } from '../src/browsers/manifest'

const manifest: GeneralManifest = {
  manifest_version: 3,
  name: 'Example',
  version: '1.0.0'
}

describe('defineConfig', () => {
  test('fills in empty defaults for vite, devManifest and amber when omitted', () => {
    const config = defineConfig({ manifest })

    expect(config.manifest).toBe(manifest)
    expect(config.vite).toEqual({})
    expect(config.devManifest).toEqual({})
    expect(config.amber).toEqual({})
  })

  test('passes through a provided vite config, devManifest and amber options unchanged', () => {
    const devManifest = { name: 'Example (dev)' }
    const vite = { base: '/custom/' }
    const amber = { bypassCSP: true }

    const config = defineConfig({ manifest, devManifest, vite, amber })

    expect(config.vite).toBe(vite)
    expect(config.devManifest).toBe(devManifest)
    expect(config.amber).toBe(amber)
  })

  test('keeps devManifest and manifest as distinct objects (caller merges them, defineConfig does not)', () => {
    const devManifest = { name: 'Dev Name' }
    const config = defineConfig({ manifest, devManifest })

    expect(config.manifest.name).toBe('Example')
    expect(config.devManifest).toEqual({ name: 'Dev Name' })
  })
})
