import { describe, expect, test } from 'bun:test'
import Messaging from '../../src/messaging/Messaging'
import { getMode } from '../../src/messaging/MessageMisc'
import {
  createFakeMessagingChrome,
  FIREFOX_ORIGIN,
  installFakeChrome,
  TEST_ORIGIN,
  withBackgroundPage,
  withMode,
  withWindow,
  type FakeManifest,
} from '../support/fake-chrome'

const FIREFOX_MANIFEST: FakeManifest = { manifest_version: 3, background: { scripts: ['entries/background.js'] } }

describe('getMode', () => {
  const cases: [string, string, FakeManifest | undefined, string | undefined, string][] = [
    ['no window', TEST_ORIGIN, undefined, undefined, 'background'],
    ['moz-extension background document', FIREFOX_ORIGIN, FIREFOX_MANIFEST, `${FIREFOX_ORIGIN}/_generated_background_page.html`, 'background'],
    ['moz-extension popup', FIREFOX_ORIGIN, FIREFOX_MANIFEST, `${FIREFOX_ORIGIN}/popup.html`, 'ui'],
    ['web page', FIREFOX_ORIGIN, FIREFOX_MANIFEST, 'https://example.com/', 'content'],
    ['chrome-extension ui page', TEST_ORIGIN, undefined, `${TEST_ORIGIN}/index.html`, 'ui'],
    ['manifest v2 at background path', FIREFOX_ORIGIN, { manifest_version: 2, background: { scripts: ['bg.js'] } }, `${FIREFOX_ORIGIN}/_generated_background_page.html`, 'ui'],
    ['custom background.page', FIREFOX_ORIGIN, { manifest_version: 3, background: { page: 'bg.html' } }, `${FIREFOX_ORIGIN}/bg.html`, 'background'],
  ]

  for (const [name, origin, manifest, href, expected] of cases) {
    test(`${name} → ${expected}`, () => {
      installFakeChrome(createFakeMessagingChrome(origin, manifest))

      expect(withWindow(href, () => getMode())).toBe(expected as ReturnType<typeof getMode>)
    })
  }
})

describe('Firefox event page background', () => {
  test('ui.background.send() reaches a handler registered in the background document', async () => {
    installFakeChrome(createFakeMessagingChrome(FIREFOX_ORIGIN, FIREFOX_MANIFEST))

    const background = withBackgroundPage(FIREFOX_ORIGIN, () => new Messaging())
    background.handle('double', (n: number) => n * 2)

    const ui = withMode('ui', FIREFOX_ORIGIN, () => new Messaging())

    expect(await ui.background.send('double', 21)).toBe(42)
  })
})
