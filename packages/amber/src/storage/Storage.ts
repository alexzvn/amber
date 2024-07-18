import { storageOf } from './wrapper'

type WrappedStorage = ReturnType<typeof storageOf>

const cache = new Map<string, WrappedStorage>()

const getTypeStorage = (type: 'session'|'sync'|'managed'|'local') => {
  if (cache.has(type)) {
    return cache.get(type)!
  }

  const storage = storageOf(chrome.storage[type], type)

  cache.set(type, storage)

  return storage
}

const Storage = {
  // Lazy init storage method
  get get() { return getTypeStorage('local').get },
  get set() { return getTypeStorage('local').set },
  get getByteUsed() { return getTypeStorage('local').getByteUsed },
  get item() { return getTypeStorage('local').item },
  get remove() { return getTypeStorage('local').remove },
  get watch() { return getTypeStorage('local').watch },

  // Lazy init other type of storage
  get session() { return getTypeStorage('session') },
  get sync() { return getTypeStorage('sync') },
  get managed() { return getTypeStorage('managed') },
}

export default Storage