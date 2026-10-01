import { beforeEach, describe, expect, test } from 'bun:test'
import Messaging from '../../src/messaging/Messaging'
import { MessagingError } from '../../src/messaging/MessageMisc'
import { createFakeMessagingChrome, installFakeChrome, TEST_ORIGIN, withMode } from '../support/fake-chrome'

describe('Messaging', () => {
  beforeEach(() => {
    installFakeChrome(createFakeMessagingChrome())
  })

  describe('self channel (in-process, no runtime round trip)', () => {
    test('emit() invokes every locally registered event handler', () => {
      const messaging = new Messaging()
      const seen: number[] = []

      messaging.on('tick', (n: number) => seen.push(n))
      messaging.on('tick', (n: number) => seen.push(n * 10))
      messaging.self.emit('tick', 5)

      expect(seen).toEqual([5, 50])
    })

    test('handle() returns the registered handler\'s value directly', () => {
      const messaging = new Messaging()
      messaging.handle('double', (n: number) => n * 2)

      expect(messaging.self.handle('double', 21)).toBe(42)
    })

    test('handle() throws when no handler is registered for the key', () => {
      const messaging = new Messaging()

      expect(() => messaging.self.handle('missing')).toThrow('Handler missing is not set yet')
    })

    test('off() removes a previously registered handler', () => {
      const messaging = new Messaging()
      const seen: number[] = []
      const handler = (n: number) => seen.push(n)

      messaging.on('tick', handler)
      messaging.off('tick', handler)
      messaging.self.emit('tick', 1)

      expect(seen).toEqual([])
    })
  })

  describe('background/ui request-response round trip', () => {
    test('ui.background.send() resolves with the background handler\'s return value', async () => {
      const background = new Messaging()
      background.handle('sum', (a: number, b: number) => a + b)

      const ui = withMode('ui', TEST_ORIGIN, () => new Messaging())

      await expect(ui.background.send('sum', 2, 3)).resolves.toBe(5)
    })

    test('errors thrown in the background handler cross the wire as a MessagingError with the message preserved', async () => {
      const background = new Messaging()
      background.handle('explode', () => { throw new Error('kaboom') })

      const ui = withMode('ui', TEST_ORIGIN, () => new Messaging())

      let caught: unknown

      try {
        await ui.background.send('explode')
      } catch (error) {
        caught = error
      }

      expect(caught).toBeInstanceOf(MessagingError)
      expect((caught as MessagingError).message).toBe('kaboom')
    })

    test('emit() delivers an event to background listeners without expecting a response', async () => {
      const background = new Messaging()
      const seen: string[] = []
      background.on('log', (msg: string) => seen.push(msg))

      const ui = withMode('ui', TEST_ORIGIN, () => new Messaging())
      await ui.background.emit('log', 'hello')

      expect(seen).toEqual(['hello'])
    })

    test('once() handlers delivered through emit() fire exactly once and are then removed', async () => {
      const background = new Messaging()
      let calls = 0
      background.once('boot', () => { calls++ })

      const ui = withMode('ui', TEST_ORIGIN, () => new Messaging())
      await ui.background.emit('boot')
      await ui.background.emit('boot')

      expect(calls).toBe(1)
    })
  })

  describe('stream handlers', () => {
    test('requestStream() yields chunks in the order the handler produced them, then closes', async () => {
      const background = new Messaging()
      background.stream('numbers', async function* () {
        yield 1
        yield 2
        yield 3
      })

      const ui = withMode('ui', TEST_ORIGIN, () => new Messaging())
      const stream = await ui.background.requestStream('numbers')

      const chunks: number[] = []
      for await (const chunk of stream) {
        // `background`/`ui` are plain untyped `Messaging` instances here, so the
        // stream's chunk type can't be inferred across the two sides; this mirrors
        // what a real consumer gets from a shared, properly typed `Messaging` map.
        chunks.push(chunk as number)
      }

      expect(chunks).toEqual([1, 2, 3])
    })
  })

  describe('content channel (background <-> a specific tab, via chrome.tabs)', () => {
    test('background.content.send(tabId, ...) reaches the content script handler and returns its response', async () => {
      const content = withMode('content', TEST_ORIGIN, () => new Messaging())
      content.handle('ping', (value: string) => `pong:${value}`)

      const background = new Messaging()
      const result = await background.content.send(42, 'ping', 'hi')

      expect(result).toBe('pong:hi')
    })
  })
})
