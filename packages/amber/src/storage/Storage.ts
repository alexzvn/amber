import { storageOf } from './wrapper'

type WrappedStorage = ReturnType<typeof storageOf>


export default class Storage {
  private static _cache = new Map<string, WrappedStorage>()

  private static from(type: 'session'|'sync'|'managed'|'local') {
    if (Storage._cache.has(type)) {
      return Storage._cache.get(type)!
    }

    const storage = storageOf(chrome.storage[type], type)

    Storage._cache.set(type, storage)

    return storage
  }

  static get get() { return Storage.from('local').get }
  static get set() { return Storage.from('local').set }
  static get getByteUsed() { return Storage.from('local').getByteUsed }
  static get item() { return Storage.from('local').item }
  static get remove() { return Storage.from('local').remove }
  static get watch() { return Storage.from('local').watch }

  static get session() { return Storage.from('session') }
  static get sync() { return Storage.from('sync') }
  static get managed() { return Storage.from('managed') }
}