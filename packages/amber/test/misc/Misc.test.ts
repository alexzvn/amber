import { describe, expect, mock, test } from 'bun:test'
import {
  base64ToBuffer,
  bufferToBase64,
  invokeOnce,
  panic,
  pick,
  retries,
  safeAsyncCall,
  safeCall,
  tap,
} from '../../src/misc/Misc'

describe('invokeOnce()', () => {
  test('invokes the handler only on the first call and caches its result', () => {
    const handler = mock((x: number) => x * 2)
    const once = invokeOnce(handler)

    expect(once(5)).toBe(10)
    expect(once(99)).toBe(10)
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('safeCall()', () => {
  test('returns the handler result when it does not throw', () => {
    expect(safeCall(() => 42)).toBe(42)
  })

  test('returns undefined and forwards the error to onError when the handler throws', () => {
    const onError = mock((_error: unknown) => {})
    const result = safeCall(() => { throw new Error('boom') }, onError)

    expect(result).toBeUndefined()
    expect(onError).toHaveBeenCalledTimes(1)
    const [receivedError] = onError.mock.calls[0] as [Error]
    expect(receivedError.message).toBe('boom')
  })
})

describe('safeAsyncCall()', () => {
  test('resolves with the handler value on success', async () => {
    await expect(safeAsyncCall(async () => 7)).resolves.toBe(7)
  })

  test('resolves with onError() return value when the handler rejects', async () => {
    const result = await safeAsyncCall(
      async () => { throw new Error('nope') },
      (e) => `handled: ${(e as Error).message}`,
    )

    expect(result).toBe('handled: nope')
  })
})

describe('tap()', () => {
  test('invokes the side effect and returns the original value unchanged', () => {
    const seen: number[] = []
    const result = tap(3, (v) => seen.push(v))

    expect(result).toBe(3)
    expect(seen).toEqual([3])
  })
})

describe('retries()', () => {
  test('returns on the first successful attempt without retrying further', async () => {
    let attempts = 0
    const result = await retries(3, async () => { attempts++; return 'ok' })

    expect(result).toBe('ok')
    expect(attempts).toBe(1)
  })

  test('retries after failures, passing the previous error to the next attempt', async () => {
    let attempts = 0
    const result = await retries(5, async (attempt, previousError) => {
      attempts++

      if (attempt < 3) {
        throw new Error(`fail-${attempt}`)
      }

      expect((previousError as Error).message).toBe('fail-2')
      return 'recovered'
    })

    expect(result).toBe('recovered')
    expect(attempts).toBe(3)
  })

  test('throws the error from the final attempt once retries are exhausted', async () => {
    let attempts = 0
    let caught: Error | undefined

    try {
      await retries(1, async () => {
        attempts++
        throw new Error(`fail-${attempts}`)
      })
    } catch (e) {
      caught = e as Error
    }

    expect(attempts).toBeGreaterThan(0)
    expect(caught?.message).toBe(`fail-${attempts}`)
  })
})

describe('base64ToBuffer()/bufferToBase64()', () => {
  test('round-trip arbitrary bytes, including 0x00/0xff edges', () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255, 10, 20, 30])
    const encoded = bufferToBase64(bytes)
    const decoded = base64ToBuffer(encoded)

    expect(decoded).toEqual(bytes)
  })
})

describe('pick()', () => {
  test('returns a new object containing only the requested keys', () => {
    const source = { a: 1, b: 2, c: 3 }
    const result = pick(source, 'a', 'c')

    expect(result.a).toBe(1)
    expect(result.c).toBe(3)
    expect('b' in result).toBe(false)
  })
})

describe('panic()', () => {
  test('throws a new Error when given a string', () => {
    expect(() => panic('bad input')).toThrow('bad input')
  })

  test('throws the given Error instance as-is', () => {
    const err = new Error('specific')
    expect(() => panic(err)).toThrow(err)
  })
})
