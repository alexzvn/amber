import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { code, sha1, sha256, sha384, sha512 } from '../../src/hashing/Hash'

describe('code()', () => {
  test('returns 0 for an empty string', () => {
    expect(code('')).toBe(0)
  })

  test('is deterministic for the same input', () => {
    expect(code('hello world')).toBe(code('hello world'))
  })

  test('produces different hashes for different strings', () => {
    expect(code('abc')).not.toBe(code('abd'))
  })

  test('stays within the 32-bit signed integer range for long input', () => {
    const hash = code('a'.repeat(5000))

    expect(Number.isInteger(hash)).toBe(true)
    expect(hash).toBeGreaterThanOrEqual(-(2 ** 31))
    expect(hash).toBeLessThan(2 ** 31)
  })
})

describe('digest functions', () => {
  const digests = { sha1, sha256, sha384, sha512 } as const

  for (const name of Object.keys(digests) as Array<keyof typeof digests>) {
    const digest = digests[name]

    test(`${name}() matches node:crypto for a string input`, async () => {
      const input = 'The quick brown fox jumps over the lazy dog'
      const expected = createHash(name).update(input).digest('hex')

      expect(await digest(input)).toBe(expected)
    })

    test(`${name}() matches node:crypto for binary input, including 0x00/0xff edge bytes`, async () => {
      const bytes = new Uint8Array([0, 1, 2, 253, 254, 255])
      const expected = createHash(name).update(Buffer.from(bytes)).digest('hex')

      expect(await digest(bytes)).toBe(expected)
    })

    test(`${name}() matches node:crypto for an empty input`, async () => {
      const expected = createHash(name).update(Buffer.alloc(0)).digest('hex')

      expect(await digest('')).toBe(expected)
    })
  }
})
