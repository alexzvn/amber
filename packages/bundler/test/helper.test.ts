import { describe, test, expect, afterEach } from 'bun:test'
import fs from 'fs/promises'
import os from 'os'
import { join } from 'path'
import {
  mkdir,
  exists,
  version,
  pick,
  pathDiscover,
  invokeOnce,
  hash,
  escapeExecutePath
} from '../src/helper'

describe('version', () => {
  test('splits a plain semver into short (x.y.z) and full (x.y.z.label) forms', () => {
    expect(version('1.2.3')).toEqual({ short: '1.2.3', full: '1.2.3.0' })
  })

  test('preserves a numeric trailing build label as the 4th segment', () => {
    expect(version('1.2.3-4')).toEqual({ short: '1.2.3', full: '1.2.3.4' })
  })

  test('defaults to 1.0.0 when no version string is given', () => {
    expect(version()).toEqual({ short: '1.0.0', full: '1.0.0.0' })
  })

  test('strips non-numeric/non-separator characters (e.g. a leading "v")', () => {
    expect(version('v2.0.1')).toEqual({ short: '2.0.1', full: '2.0.1.0' })
  })
})

describe('pick', () => {
  test('returns a new object containing only the requested keys', () => {
    const source = { a: 1, b: 2, c: 3 }
    expect(pick(source, 'a', 'c')).toEqual({ a: 1, c: 3 })
  })

  test('does not mutate the source object', () => {
    const source = { a: 1, b: 2 }
    pick(source, 'a')
    expect(source).toEqual({ a: 1, b: 2 })
  })
})

describe('pathDiscover', () => {
  test('splits dir, filename, name and extension for a nested path', () => {
    expect(pathDiscover('src/content/main.ts')).toEqual({
      dir: 'src/content',
      filename: 'main.ts',
      name: 'main',
      ext: 'ts'
    })
  })

  test('treats a bare filename (no directory) as an empty dir', () => {
    expect(pathDiscover('index.ts')).toEqual({
      dir: '',
      filename: 'index.ts',
      name: 'index',
      ext: 'ts'
    })
  })

  test('keeps only the last extension for multi-dot filenames (e.g. content-script.iife.dev.js)', () => {
    expect(pathDiscover('src/client/content-script.iife.dev.js')).toEqual({
      dir: 'src/client',
      filename: 'content-script.iife.dev.js',
      name: 'content-script.iife.dev',
      ext: 'js'
    })
  })
})

describe('invokeOnce', () => {
  test('invokes the wrapped handler on the first call and returns its result', () => {
    let calls = 0
    const fn = invokeOnce((x: number) => { calls++; return x * 2 })

    expect(fn(5)).toBe(10)
    expect(calls).toBe(1)
  })

  test('suppresses every subsequent call, returning undefined without re-invoking', () => {
    let calls = 0
    const fn = invokeOnce((x: number) => { calls++; return x * 2 })

    fn(5)
    expect(fn(99)).toBeUndefined()
    expect(calls).toBe(1)
  })
})

describe('hash', () => {
  test('is deterministic: identical input always yields the same hash', () => {
    expect(hash('console.log(1)')).toBe(hash('console.log(1)'))
  })

  test('differs for different input (collision-free for these fixtures)', () => {
    expect(hash('a')).not.toBe(hash('b'))
  })

  test('returns 0 for an empty string', () => {
    expect(hash('')).toBe(0)
  })
})

describe('escapeExecutePath', () => {
  test('on posix, backslash-escapes spaces in the path', () => {
    if (process.platform === 'win32') return
    expect(escapeExecutePath('my project/file.ts')).toBe('my\\ project/file.ts')
  })

  test('on posix, normalizes backslashes to forward slashes', () => {
    if (process.platform === 'win32') return
    expect(escapeExecutePath('dir\\file.ts')).toBe('dir/file.ts')
  })
})

describe('exists', () => {
  const tmpTarget = join(os.tmpdir(), `amber-exists-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`)

  afterEach(async () => {
    await fs.rm(tmpTarget, { force: true })
  })

  test('resolves true for a file that is present', async () => {
    await fs.writeFile(tmpTarget, 'x')
    expect(await exists(tmpTarget)).toBe(true)
  })

  test('resolves false for a path that does not exist', async () => {
    expect(await exists(tmpTarget)).toBe(false)
  })
})

describe('mkdir', () => {
  test('recursively creates a nested directory that does not yet exist', async () => {
    const dir = await fs.mkdtemp(join(os.tmpdir(), 'amber-mkdir-'))
    const nested = join(dir, 'a', 'b', 'c')

    try {
      await mkdir(nested)
      expect(await exists(nested)).toBe(true)
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  test('swallows the error and resolves when the directory already exists', async () => {
    const dir = await fs.mkdtemp(join(os.tmpdir(), 'amber-mkdir-'))

    try {
      await expect(mkdir(dir)).resolves.toBeUndefined()
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })
})
