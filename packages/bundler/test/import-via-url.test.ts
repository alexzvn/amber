import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import fs from 'fs/promises'
import os from 'os'
import { join } from 'path'
import type { PluginContext, ResolveIdResult } from 'vite'
import ImportViaURL from '../src/plugins/ImportViaURL'

// Minimal fake PluginContext: ImportViaURL's resolveId hook only calls
// `this.debug`, `this.info` and `this.resolve`. The real PluginContext
// interface carries dozens of unrelated rollup/vite APIs we never invoke,
// so an unchecked cast to the real type is the pragmatic boundary here.
const fakeContext = (resolve: (id: string) => Promise<ResolveIdResult>) => {
  const debugLog: string[] = []
  const infoLog: string[] = []

  const context = {
    debug: (msg: string) => { debugLog.push(msg) },
    info: (msg: string) => { infoLog.push(msg) },
    resolve
  } as unknown as PluginContext

  return { context, debugLog, infoLog }
}

let tmpDir: string
let originalCwd: string
let originalFetch: typeof fetch

beforeEach(async () => {
  originalCwd = process.cwd()
  tmpDir = await fs.mkdtemp(join(os.tmpdir(), 'amber-import-url-'))
  process.chdir(tmpDir)
  originalFetch = globalThis.fetch
})

afterEach(async () => {
  process.chdir(originalCwd)
  globalThis.fetch = originalFetch
  await fs.rm(tmpDir, { recursive: true, force: true })
})

const getResolveId = async () => {
  const plugin = await ImportViaURL()
  const resolveId = plugin.resolveId

  if (typeof resolveId !== 'function') {
    throw new Error('expected ImportViaURL().resolveId to be a plain function')
  }

  return resolveId
}

describe('ImportViaURL#resolveId: non-url ids', () => {
  test('passes through a bare relative specifier untouched', async () => {
    const resolveId = await getResolveId()
    const { context } = fakeContext(async id => ({ id }))

    const result = await resolveId.call(context, './local-module.ts', undefined, { isEntry: false })

    expect(result).toBeUndefined()
  })

  test('passes through an id with an unrelated "scheme:" prefix (e.g. node:)', async () => {
    const resolveId = await getResolveId()
    const { context } = fakeContext(async id => ({ id }))

    const result = await resolveId.call(context, 'node:fs', undefined, { isEntry: false })

    expect(result).toBeUndefined()
  })

  test('passes through "url:" with a non-http(s) target (e.g. file:) without touching the network', async () => {
    const resolveId = await getResolveId()
    const { context } = fakeContext(async id => ({ id }))

    let fetchCalled = false
    globalThis.fetch = (() => { fetchCalled = true; throw new Error('should not fetch') }) as typeof fetch

    const result = await resolveId.call(context, 'url:file:///etc/passwd', undefined, { isEntry: false })

    expect(result).toBeUndefined()
    expect(fetchCalled).toBe(false)
  })

  test('passes through "url:" with an unparsable URL without touching the network', async () => {
    const resolveId = await getResolveId()
    const { context } = fakeContext(async id => ({ id }))

    let fetchCalled = false
    globalThis.fetch = (() => { fetchCalled = true; throw new Error('should not fetch') }) as typeof fetch

    const result = await resolveId.call(context, 'url:not a valid url at all', undefined, { isEntry: false })

    expect(result).toBeUndefined()
    expect(fetchCalled).toBe(false)
  })
})

describe('ImportViaURL#resolveId: cache miss', () => {
  test('downloads the module, writes it under .amber/cache, and hands the cached path to this.resolve', async () => {
    const resolveId = await getResolveId()

    let fetchedURL = ''
    globalThis.fetch = (async (input: string | URL) => {
      fetchedURL = String(input)
      return new Response(new TextEncoder().encode('export const value = 42;'))
    }) as typeof fetch

    let resolvedWith = ''
    const { context, infoLog } = fakeContext(async id => { resolvedWith = id; return { id } })

    const source = 'url:https://cdn.example.com/lib/value.js'
    await resolveId.call(context, source, undefined, { isEntry: false })

    expect(fetchedURL).toBe('https://cdn.example.com/lib/value.js')
    expect(resolvedWith.startsWith('.amber/cache/')).toBe(true)
    expect(infoLog.some(m => m.startsWith('Downloading'))).toBe(true)
    expect(infoLog.some(m => m.startsWith('Downloaded'))).toBe(true)

    const cachedPath = join(tmpDir, resolvedWith)
    const cachedContent = await fs.readFile(cachedPath, 'utf8')
    expect(cachedContent).toBe('export const value = 42;')
  })

  test('names the cached file from the amber-cache query param when present', async () => {
    const resolveId = await getResolveId()

    globalThis.fetch = (async () => new Response(new TextEncoder().encode('x'))) as typeof fetch
    let resolvedWith = ''
    const { context } = fakeContext(async id => { resolvedWith = id; return { id } })

    await resolveId.call(
      context,
      'url:https://cdn.example.com/lib/value.js?amber-cache=pinned-name.js',
      undefined,
      { isEntry: false }
    )

    expect(resolvedWith.endsWith('-pinned-name.js')).toBe(true)
  })

  test('falls back to the URL pathname basename as the cached filename when no amber-cache param is given', async () => {
    const resolveId = await getResolveId()

    globalThis.fetch = (async () => new Response(new TextEncoder().encode('x'))) as typeof fetch
    let resolvedWith = ''
    const { context } = fakeContext(async id => { resolvedWith = id; return { id } })

    await resolveId.call(context, 'url:https://cdn.example.com/lib/value.js', undefined, { isEntry: false })

    expect(resolvedWith.endsWith('-value.js')).toBe(true)
  })

  test('writes a .d.ts declaration under .amber/types before resolving', async () => {
    const resolveId = await getResolveId()

    globalThis.fetch = (async () => new Response(new TextEncoder().encode('export const value = 42;'))) as typeof fetch
    let resolvedWith = ''
    const { context } = fakeContext(async id => { resolvedWith = id; return { id } })

    const source = 'url:https://cdn.example.com/lib/value.js'
    await resolveId.call(context, source, undefined, { isEntry: false })

    const target = resolvedWith.replace('.amber/cache/', '')
    const dtsPath = join(tmpDir, '.amber', 'types', `${target}.d.ts`)
    const declaration = await fs.readFile(dtsPath, 'utf8')
    expect(declaration).toContain(`declare module ${JSON.stringify(source)}`)
  })
})

describe('ImportViaURL#resolveId: cache hit', () => {
  test('reuses an existing cache file without calling fetch again', async () => {
    const resolveId = await getResolveId()
    let fetchCalls = 0

    globalThis.fetch = (async () => {
      fetchCalls++
      return new Response(new TextEncoder().encode('export const value = 1;'))
    }) as typeof fetch

    const source = 'url:https://cdn.example.com/lib/shared.js'

    let firstResolvedWith = ''
    const { context: firstContext } = fakeContext(async id => { firstResolvedWith = id; return { id } })

    await resolveId.call(firstContext, source, undefined, { isEntry: false })
    expect(fetchCalls).toBe(1)

    const { context: secondContext, debugLog } = fakeContext(async id => ({ id }))
    const result = await resolveId.call(secondContext, source, undefined, { isEntry: false })

    expect(fetchCalls).toBe(1)
    expect(debugLog.some(m => m.startsWith('Cache hit'))).toBe(true)
    expect(result).toEqual({ id: firstResolvedWith })
  })
})

describe('ImportViaURL#resolveId: failed download', () => {
  test('wraps a network failure in a descriptive "Failed to download module" error', async () => {
    const resolveId = await getResolveId()

    globalThis.fetch = (async () => { throw new Error('ECONNREFUSED') }) as typeof fetch
    const { context } = fakeContext(async id => ({ id }))

    const source = 'url:https://cdn.example.com/lib/unreachable.js'

    await expect(resolveId.call(context, source, undefined, { isEntry: false }))
      .rejects.toThrow(/Failed to download module/)
  })
})
