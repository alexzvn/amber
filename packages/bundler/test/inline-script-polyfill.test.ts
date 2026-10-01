import { describe, test, expect, afterEach } from 'bun:test'
import fs from 'fs/promises'
import os from 'os'
import { join } from 'path'
import InlineScriptPolyfill from '../src/plugins/InlineScriptPolyfill'
import type { ResolvedConfig, IndexHtmlTransformHook, Plugin } from 'vite'

const fakeConfig = (outDir: string) => ({ build: { outDir } } as ResolvedConfig)

// The plugin's transformIndexHtml hook always resolves a plain string (it
// returns `root.toString()`), never the object/tags variant Vite also
// allows, so narrowing to string is a safe, verified assumption here.
const transformHtml = async (plugin: Plugin, html: string): Promise<string> => {
  const hook = plugin.transformIndexHtml as IndexHtmlTransformHook
  const result = await hook(html, {} as never)
  if (typeof result !== 'string') {
    throw new Error('expected transformIndexHtml to resolve a plain string')
  }
  return result
}

describe('InlineScriptPolyfill#transformIndexHtml', () => {
  test('replaces an inline <script> body with a hashed external src under shared/inline-<hash>.js', async () => {
    const plugin = InlineScriptPolyfill()
    const html = '<html><body><script>console.log("hi")</script></body></html>'

    const out = await transformHtml(plugin, html)

    expect(out).not.toContain('console.log')
    expect(out).toMatch(/<script src="\/shared\/inline--?[0-9a-f]+\.js"><\/script>/)
  })

  test('produces the same hash/src for byte-identical inline script content (stable hashing)', async () => {
    const plugin = InlineScriptPolyfill()
    const htmlA = '<div><script>const x = 1;</script></div>'
    const htmlB = '<section><script>const x = 1;</script></section>'

    const outA = await transformHtml(plugin, htmlA)
    const outB = await transformHtml(plugin, htmlB)

    const srcA = /src="([^"]+)"/.exec(outA)?.[1]
    const srcB = /src="([^"]+)"/.exec(outB)?.[1]

    expect(srcA).toBeTruthy()
    expect(srcA).toBe(srcB)
  })

  test('leaves scripts that already declare a src untouched', async () => {
    const plugin = InlineScriptPolyfill()
    const html = '<html><body><script src="/already/external.js"></script></body></html>'

    const out = await transformHtml(plugin, html)

    expect(out).toContain('src="/already/external.js"')
  })

  test('ignores a <script> tag with only whitespace content (no src injected)', async () => {
    const plugin = InlineScriptPolyfill()
    const html = '<html><body><script>   </script></body></html>'

    const out = await transformHtml(plugin, html)

    expect(out).not.toContain('shared/inline-')
  })
})

describe('InlineScriptPolyfill#writeBundle', () => {
  let tmpDir: string

  afterEach(async () => {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true })
  })

  test('writes one shared/inline-<hash>.js file per distinct inline script seen during the build', async () => {
    tmpDir = await fs.mkdtemp(join(os.tmpdir(), 'amber-inline-'))
    const plugin = InlineScriptPolyfill()

    plugin.configResolved?.(fakeConfig(tmpDir))
    await transformHtml(plugin, '<script>const a = 1;</script>')
    await transformHtml(plugin, '<script>const b = 2;</script>')
    await transformHtml(plugin, '<script>const a = 1;</script>')

    await plugin.writeBundle?.call({} as never, {} as never, {} as never)

    const files = await fs.readdir(join(tmpDir, 'shared'))
    expect(files).toHaveLength(2)
    expect(files.every(f => /^inline--?[0-9a-f]+\.js$/.test(f))).toBe(true)
  })

  test('each emitted file contains exactly the original inline script source', async () => {
    tmpDir = await fs.mkdtemp(join(os.tmpdir(), 'amber-inline-'))
    const plugin = InlineScriptPolyfill()

    plugin.configResolved?.(fakeConfig(tmpDir))
    await transformHtml(plugin, '<script>const shouldMatch = true;</script>')
    await plugin.writeBundle?.call({} as never, {} as never, {} as never)

    const files = await fs.readdir(join(tmpDir, 'shared'))
    const content = await fs.readFile(join(tmpDir, 'shared', files[0]), 'utf8')
    expect(content).toBe('const shouldMatch = true;')
  })

  test('does not create a shared/ directory when there were no inline scripts', async () => {
    tmpDir = await fs.mkdtemp(join(os.tmpdir(), 'amber-inline-'))
    const plugin = InlineScriptPolyfill()

    plugin.configResolved?.(fakeConfig(tmpDir))
    await plugin.writeBundle?.call({} as never, {} as never, {} as never)

    await expect(fs.access(join(tmpDir, 'shared'))).rejects.toThrow()
  })
})

describe('InlineScriptPolyfill#configureServer middleware', () => {
  test('serves the stored inline script source as text/javascript for a matching shared/inline-<hash>.js request', async () => {
    const plugin = InlineScriptPolyfill()

    let capturedMiddleware: ((req: unknown, res: unknown, next: () => void) => void) | undefined
    const server = {
      middlewares: {
        use: (fn: typeof capturedMiddleware) => { capturedMiddleware = fn }
      }
    }

    plugin.configureServer?.call({} as never, server as never)
    expect(capturedMiddleware).toBeDefined()

    const out = await transformHtml(plugin, '<script>const dev = true;</script>')
    const actualPath = /src="([^"]+)"/.exec(out)
    if (!actualPath) throw new Error('expected an injected script src')

    const written: Buffer[] = []
    let statusCode = 0
    let headers: Record<string, string> = {}

    const res = {
      writeHead: (code: number, h: Record<string, string>) => { statusCode = code; headers = h },
      write: (chunk: string, cb: () => void) => { written.push(Buffer.from(chunk)); cb() },
      end: () => {}
    }

    capturedMiddleware!({ url: actualPath[1], headers: { host: 'localhost' } }, res, () => {
      throw new Error('next() should not be called for a matching inline script request')
    })

    expect(statusCode).toBe(200)
    expect(headers['Content-Type']).toBe('text/javascript')
    expect(Buffer.concat(written).toString()).toBe('const dev = true;')
  })

  test('calls next() for a request that does not match any registered inline script', () => {
    const plugin = InlineScriptPolyfill()

    let capturedMiddleware: ((req: unknown, res: unknown, next: () => void) => void) | undefined
    const server = { middlewares: { use: (fn: typeof capturedMiddleware) => { capturedMiddleware = fn } } }
    plugin.configureServer?.call({} as never, server as never)

    let nextCalled = false
    capturedMiddleware!(
      { url: '/shared/inline-doesnotexist.js', headers: { host: 'localhost' } },
      { writeHead: () => { throw new Error('should not write') }, write: () => {}, end: () => {} },
      () => { nextCalled = true }
    )

    expect(nextCalled).toBe(true)
  })
})
