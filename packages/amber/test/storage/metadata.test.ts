import { beforeEach, describe, expect, test } from 'bun:test'
import { createMetadataRepository } from '../../src/storage/metadata'
import { createFakeStorageArea, installFakeChrome, type FakeStorageArea } from '../support/fake-chrome'

describe('createMetadataRepository', () => {
  let area: FakeStorageArea

  beforeEach(() => {
    area = createFakeStorageArea()
    installFakeChrome({ storage: { local: area } })
  })

  test('returns undefined for a key with no stored metadata', async () => {
    const repo = createMetadataRepository('local')

    expect(await repo.get('missing')).toBeUndefined()
  })

  test('set() merges fields into the per-key metadata across calls', async () => {
    const repo = createMetadataRepository('local')

    await repo.set('item-a', { version: 1 })
    await repo.set('item-a', { ttl: 5000 })

    expect(await repo.get('item-a')).toEqual({ version: 1, ttl: 5000 })
    expect(area.data['$amber:storage.meta.local']).toEqual({
      'item-a': { version: 1, ttl: 5000 },
    })
  })

  test('set() strips fields whose value is explicitly undefined', async () => {
    const repo = createMetadataRepository('local')

    await repo.set('item-b', { version: 2, ttl: 100 })
    await repo.set('item-b', { ttl: undefined })

    expect(await repo.get('item-b')).toEqual({ version: 2 })
  })

  test('remove() deletes existing metadata and persists the change', async () => {
    const repo = createMetadataRepository('local')

    await repo.set('item-c', { version: 1 })
    await repo.remove('item-c')

    expect(await repo.get('item-c')).toBeUndefined()
    expect(area.data['$amber:storage.meta.local']).toEqual({})
  })

  test('remove() on a key with no metadata leaves the container untouched', async () => {
    const repo = createMetadataRepository('local')

    await repo.get('anything') // wait for setup to seed the container
    const before = { ...(area.data['$amber:storage.meta.local'] as Record<string, unknown>) }

    await repo.remove('never-existed')

    expect(area.data['$amber:storage.meta.local']).toEqual(before)
  })

  test('different repository types persist metadata under independently namespaced storage keys', async () => {
    const localRepo = createMetadataRepository('local')
    const syncRepo = createMetadataRepository('sync')

    await localRepo.set('shared-key', { version: 1 })
    await syncRepo.set('shared-key', { version: 99 })

    expect(await localRepo.get('shared-key')).toEqual({ version: 1 })
    expect(await syncRepo.get('shared-key')).toEqual({ version: 99 })
    expect(area.data['$amber:storage.meta.local']).toEqual({ 'shared-key': { version: 1 } })
    expect(area.data['$amber:storage.meta.sync']).toEqual({ 'shared-key': { version: 99 } })
  })
})
