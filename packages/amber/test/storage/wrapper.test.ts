import { beforeEach, describe, expect, test } from 'bun:test'
import { storageOf, wrap } from '../../src/storage/wrapper'
import { asStorageArea, createFakeStorageArea, type FakeStorageArea } from '../support/fake-chrome'

describe('storageOf().item', () => {
  let area: FakeStorageArea

  beforeEach(() => {
    area = createFakeStorageArea()
  })

  test('runs the initializer once and is ready with the initial value', async () => {
    let calls = 0
    const storage = storageOf(asStorageArea(area), 'local')
    const item = storage.item('count', (): number => { calls++; return 5 })

    await item.ready

    expect(item.value).toBe(5)
    expect(calls).toBe(1)
    expect(area.data.count).toBe(5)
  })

  test('reads a pre-existing stored value instead of calling the initializer', async () => {
    area.data.name = 'stored-value'
    let calls = 0
    const storage = storageOf(asStorageArea(area), 'local')
    const item = storage.item('name', (): string => { calls++; return 'default' })

    expect(await item.read()).toBe('stored-value')
    expect(calls).toBe(0)
  })

  test('maps an undefined initial value to null in storage and back to undefined on read', async () => {
    const storage = storageOf(asStorageArea(area), 'local')
    const item = storage.item<string | undefined>('maybe', undefined)

    await item.ready

    expect(area.data.maybe).toBeNull()
    expect(item.value).toBeUndefined()
  })

  test('write() persists the value and maps undefined to null in storage', async () => {
    const storage = storageOf(asStorageArea(area), 'local')
    const item = storage.item<string | undefined>('token', 'initial')

    await item.write('updated')
    expect(item.value).toBe('updated')
    expect(area.data.token).toBe('updated')

    await item.write(undefined)
    expect(area.data.token).toBeNull()
    expect(item.value).toBeUndefined()
  })

  test('the .value setter is a shorthand for write()', async () => {
    const storage = storageOf(asStorageArea(area), 'local')
    const item = storage.item('flag', false)
    await item.ready

    item.value = true

    expect(await item.read()).toBe(true)
    expect(area.data.flag).toBe(true)
  })

  test('reset() restores the initializer value and persists it', async () => {
    const storage = storageOf(asStorageArea(area), 'local')
    const item = storage.item('counter', (): number => 1)

    await item.write(99)
    await item.reset()

    expect(item.value).toBe(1)
    expect(area.data.counter).toBe(1)
  })

  test('subscribe() without immediate only delivers future changes, not the current value', async () => {
    const storage = storageOf(asStorageArea(area), 'local')
    const item = storage.item('x', 0)
    await item.ready

    const seen: Array<[number, number | undefined]> = []
    const unsubscribe = item.subscribe((value, old) => seen.push([value, old]))

    expect(seen).toEqual([])

    await item.write(10)
    expect(seen).toEqual([[10, 0]])

    unsubscribe()
    await item.write(20)
    expect(seen).toEqual([[10, 0]])
  })

  test('subscribe({ immediate: true }) delivers the current value once after ready, then future changes', async () => {
    const storage = storageOf(asStorageArea(area), 'local')
    const item = storage.item('y', 'a')

    const seen: Array<[string, string | undefined]> = []
    item.subscribe((value, old) => seen.push([value, old]), { immediate: true })

    expect(seen).toEqual([])

    await item.ready
    expect(seen).toEqual([['a', undefined]])

    await item.write('b')
    expect(seen).toEqual([['a', undefined], ['b', 'a']])
  })

  test('unsubscribing an immediate subscription before ready cancels the initial delivery', async () => {
    const storage = storageOf(asStorageArea(area), 'local')
    const item = storage.item('z', 1)

    const seen: number[] = []
    const unsubscribe = item.subscribe((value) => seen.push(value), { immediate: true })
    unsubscribe()

    await item.ready
    await item.write(2)

    expect(seen).toEqual([])
  })

  test('size() reports a larger byte count after writing a bigger value', async () => {
    const storage = storageOf(asStorageArea(area), 'local')
    const item = storage.item('big', 'a')
    await item.ready

    const small = await item.size()
    await item.write('a'.repeat(1000))
    const large = await item.size()

    expect(large).toBeGreaterThan(small)
  })
})

describe('wrap()', () => {
  test('get/set/remove round-trip values through the underlying storage area', async () => {
    const area = createFakeStorageArea()
    const repo = wrap(asStorageArea(area))

    await repo.set('k', 'v')
    expect(await repo.get<string>('k')).toBe('v')

    await repo.remove('k')
    expect(await repo.get<string>('k')).toBeUndefined()
  })

  test('watch() delivers new/old values on change and stops after unsubscribe', async () => {
    const area = createFakeStorageArea()
    const repo = wrap(asStorageArea(area))

    const seen: Array<[unknown, unknown]> = []
    const stop = repo.watch('k', (value, old) => seen.push([value, old]))

    await repo.set('k', 'first')
    await repo.set('k', 'second')
    expect(seen).toEqual([['first', undefined], ['second', 'first']])

    stop()
    await repo.set('k', 'third')
    expect(seen).toEqual([['first', undefined], ['second', 'first']])
  })
})
