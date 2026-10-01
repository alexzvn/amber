import { beforeAll, describe, expect, test } from 'bun:test'
import Storage from '../../src/storage/Storage'
import { createFakeStorageArea, installFakeChrome } from '../support/fake-chrome'

// `Storage` memoizes a `storageOf(...)` wrapper per area name in a module-level
// static cache, mirroring how `chrome.storage.local` is itself a process-wide
// singleton in a real extension. The fake chrome areas are installed once for
// the whole describe block so that memoization behavior is observed honestly
// (a `beforeEach` that swaps the underlying fake would silently defeat it).
describe('Storage (static chrome.storage wrapper)', () => {
  const areas = {
    local: createFakeStorageArea(),
    session: createFakeStorageArea(),
    sync: createFakeStorageArea(),
    managed: createFakeStorageArea(),
  }

  beforeAll(() => {
    installFakeChrome({ storage: areas })
  })

  test('get/set/remove proxy directly to the local storage area', async () => {
    await Storage.set('key', 'value')
    expect(await Storage.get<string>('key')).toBe('value')
    expect(areas.local.data.key).toBe('value')

    await Storage.remove('key')
    expect(await Storage.get<string>('key')).toBeUndefined()
  })

  test('session/sync/managed each operate on their own independently named area', async () => {
    await Storage.session.set('shared', 'session-value')
    await Storage.sync.set('shared', 'sync-value')
    await Storage.managed.set('shared', 'managed-value')

    expect(await Storage.session.get<string>('shared')).toBe('session-value')
    expect(await Storage.sync.get<string>('shared')).toBe('sync-value')
    expect(await Storage.managed.get<string>('shared')).toBe('managed-value')
    expect(areas.local.data.shared).toBeUndefined()
  })

  test('repeated access to a named area is memoized rather than reconstructed each time', () => {
    expect(Storage.get).toBe(Storage.get)
    expect(Storage.session).toBe(Storage.session)
  })
})
