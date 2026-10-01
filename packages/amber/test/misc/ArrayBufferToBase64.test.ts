import { describe, expect, test } from 'bun:test'
import { base64ArrayBuffer } from '../../src/misc/ArrayBufferToBase64'

const toBuffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

describe('base64ArrayBuffer()', () => {
  test('matches the standard base64 encoding across every byte-remainder case (length % 3 = 0, 1, 2)', () => {
    const cases = [
      new Uint8Array([]),
      new Uint8Array([1]),
      new Uint8Array([1, 2]),
      new Uint8Array([1, 2, 3]),
      new Uint8Array([1, 2, 3, 4]),
      new Uint8Array([1, 2, 3, 4, 5]),
    ]

    for (const bytes of cases) {
      expect(base64ArrayBuffer(toBuffer(bytes))).toBe(Buffer.from(bytes).toString('base64'))
    }
  })

  test('round-trips through atob for binary edge bytes (0x00, 0xff, 0x80, 0x7f)', () => {
    const bytes = new Uint8Array([0x00, 0xff, 0x00, 0xff, 0x80, 0x7f])
    const encoded = base64ArrayBuffer(toBuffer(bytes))
    const decoded = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))

    expect(decoded).toEqual(bytes)
    expect(encoded).toBe(Buffer.from(bytes).toString('base64'))
  })

  test('encodes a full 0-255 byte range identically to Buffer#toString("base64")', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i)

    expect(base64ArrayBuffer(toBuffer(bytes))).toBe(Buffer.from(bytes).toString('base64'))
  })
})
