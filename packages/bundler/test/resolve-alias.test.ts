import { describe, test, expect, beforeEach } from 'bun:test'
import ResolveAlias from '../src/plugins/ResolveAlias'
import ContentScript from '../src/components/ContentScript'
import BackgroundScript from '../src/components/BackgroundScript'
import Page from '../src/components/Page'
import { relative } from 'path'

beforeEach(() => {
  ContentScript.$registers.length = 0
  BackgroundScript.$registers.clear()
  Page.$registers.clear()
})

describe('ResolveAlias#buildStart', () => {
  test('rewrites each registered entry file to a cwd-relative path from the resolved id', async () => {
    const cs = new ContentScript('content/main.ts', { matches: ['<all_urls>'] })
    const bg = new BackgroundScript('worker/bg.ts')
    const page = new Page('pages/options.html')

    const resolvedId = (file: string) => `/abs/${file.replace(/\.\.\//g, '')}`

    const plugin = ResolveAlias()
    const context = {
      resolve: async (file: string) => ({ id: resolvedId(file) })
    }

    await plugin.buildStart?.call(context as never, {} as never)

    expect(cs.file).toBe(relative(process.cwd(), resolvedId('content/main.ts')))
    expect(bg.file).toBe(relative(process.cwd(), resolvedId('worker/bg.ts')))
    expect(page.file).toBe(relative(process.cwd(), resolvedId('pages/options.html')))
  })

  test('leaves the original file path untouched when resolve() cannot resolve the module', async () => {
    const cs = new ContentScript('content/unresolvable.ts', { matches: ['<all_urls>'] })

    const plugin = ResolveAlias()
    const context = { resolve: async () => null }

    await plugin.buildStart?.call(context as never, {} as never)

    expect(cs.file).toBe('content/unresolvable.ts')
  })
})
