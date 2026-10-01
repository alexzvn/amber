import { describe, test, expect, beforeEach } from 'bun:test'
import ContentScript from '../src/components/ContentScript'
import BackgroundScript from '../src/components/BackgroundScript'
import Page from '../src/components/Page'
import Icons from '../src/components/Icons'

beforeEach(() => {
  ContentScript.$registers.length = 0
  BackgroundScript.$registers.clear()
  Page.$registers.clear()
  Icons.$registers.clear()
})

describe('ContentScript#toJSON', () => {
  test('serializes default es-format script with inferred js path and no css', () => {
    const cs = new ContentScript('src/content/main.ts', { matches: ['https://example.com/*'] })
    const json = cs.toJSON()

    expect(json.matches).toEqual(['https://example.com/*'])
    expect(json.js).toEqual(['scripts/main.js'])
    expect(json.css).toBeUndefined()
    expect(cs.options.format).toBe('es')
  })

  test('appends a split CSS chunk path when cssCodeSplit is explicitly disabled', () => {
    const cs = new ContentScript('src/content/main.ts', {
      matches: ['https://example.com/*'],
      cssCodeSplit: false
    })
    const json = cs.toJSON()

    expect(json.css).toEqual(['assets/main.css'])
  })

  test('keeps explicit css entries untouched when cssCodeSplit stays enabled (default)', () => {
    const cs = new ContentScript('src/content/main.ts', {
      matches: ['https://example.com/*'],
      css: ['styles/manual.css']
    })
    const json = cs.toJSON()

    expect(json.css).toEqual(['styles/manual.css'])
  })

  test('honours custom scriptDir/assetDir for generated paths', () => {
    const cs = new ContentScript('src/content/iife.ts', {
      matches: ['<all_urls>'],
      scriptDir: 'custom-scripts',
      assetDir: 'custom-assets',
      cssCodeSplit: false,
      format: 'iife'
    })
    const json = cs.toJSON()

    expect(json.js).toEqual(['custom-scripts/iife.js'])
    expect(json.css).toEqual(['custom-assets/iife.css'])
    expect(cs.options.format).toBe('iife')
  })

  test('only forwards whitelisted manifest keys, dropping unrelated options', () => {
    const cs = new ContentScript('src/content/main.ts', {
      matches: ['https://example.com/*'],
      run_at: 'document_end',
      world: 'MAIN',
      hotReload: false
    })
    const json = cs.toJSON() as Record<string, unknown>

    expect(json.run_at).toBe('document_end')
    expect(json.world).toBe('MAIN')
    expect(json.hotReload).toBeUndefined()
  })
})

describe('ContentScript.map', () => {
  test('keys registered scripts by discovered module name', () => {
    new ContentScript('src/content/one.ts', { matches: ['<all_urls>'] })
    new ContentScript('src/content/two.ts', { matches: ['<all_urls>'] })

    expect(ContentScript.map).toEqual({
      one: 'src/content/one.ts',
      two: 'src/content/two.ts'
    })
  })
})

describe('BackgroundScript', () => {
  test('toJSON produces an ES module service_worker entry under entries/', () => {
    const bg = new BackgroundScript('src/worker/index.ts')
    expect(bg.toJSON()).toEqual({
      service_worker: 'entries/index.js',
      type: 'module'
    })
  })

  test('defaults autoReload to true when omitted', () => {
    const bg = new BackgroundScript('src/worker/index.ts')
    expect(bg.options.autoReload).toBe(true)
  })

  test('preserves an explicit autoReload: false', () => {
    const bg = new BackgroundScript('src/worker/index.ts', { autoReload: false })
    expect(bg.options.autoReload).toBe(false)
  })

  test('map keys registrations by discovered name', () => {
    new BackgroundScript('src/worker/bg.ts')
    expect(BackgroundScript.map).toEqual({ bg: 'src/worker/bg.ts' })
  })
})

describe('Page', () => {
  test('toJSON falls back to the slashified file path when no target is given', () => {
    const page = new Page('src\\pages\\options.html')
    expect(page.toJSON()).toBe('src/pages/options.html')
  })

  test('toJSON prefers the remapped target over the source file', () => {
    const page = new Page('src/pages/options.html', 'options/index.html')
    expect(page.toJSON()).toBe('options/index.html')
  })

  test('toString mirrors toJSON (String subclass coercion)', () => {
    const page = new Page('src/pages/popup.html')
    expect(`${page}`).toBe('src/pages/popup.html')
  })

  test('map keys registrations by discovered name', () => {
    new Page('src/pages/options.html')
    expect(Page.map).toEqual({ options: 'src/pages/options.html' })
  })
})

describe('Icons#toJSON', () => {
  test('defaults to name=icon, dir=assets, sizes 16/32/48/128', () => {
    const icons = new Icons('src/assets/logo.png')
    expect(icons.toJSON()).toEqual({
      '16': 'assets/icon16.png',
      '32': 'assets/icon32.png',
      '48': 'assets/icon48.png',
      '128': 'assets/icon128.png'
    })
  })

  test('honours a custom name, dir and size list', () => {
    const icons = new Icons('src/assets/logo.png', {
      name: 'ext',
      dir: 'images\\icons',
      size: [19, 38]
    })
    expect(icons.toJSON()).toEqual({
      '19': 'images/icons/ext19.png',
      '38': 'images/icons/ext38.png'
    })
  })

  test('setPostImageProcess stores the handler for later use by IconProcessor', () => {
    const icons = new Icons('src/assets/logo.png')
    const handler = (_img: any, _size: number) => {}
    icons.setPostImageProcess(handler)
    expect(icons.config.postImageProcess).toBe(handler)
  })
})
