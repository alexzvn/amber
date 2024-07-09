import { storageOf } from './wrapper'

type WrappedStorage = ReturnType<typeof storageOf>

const cache = new Map<string, WrappedStorage>()

const getTypeStorage = (type: 'session'|'sync'|'managed') => {
  if (cache.has(type)) {
    return cache.get(type)
  }

  const storage = storageOf(chrome.storage[type], type)

  cache.set(type, storage)

  return storage
}

const Storage = {
  ...storageOf(chrome.storage.local, 'local'),
  get session() { return getTypeStorage('session') },
  get sync() { return getTypeStorage('sync') },
  get managed() { return getTypeStorage('managed') },
}

export default Storage