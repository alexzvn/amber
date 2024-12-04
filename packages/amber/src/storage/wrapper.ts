import type { GenericFunc } from '~/type'

export type Pair<K extends string = string, V = unknown> = Record<K, V>

type Unwrap<T> = T extends GenericFunc
  ? ReturnType<T> extends Promise<infer P>
    ? P : ReturnType<T>
  : T

type Migration<A = unknown, B = unknown> = (old: A) => B|Promise<B>

type StorageLike = chrome.storage.StorageArea

type MetaOption = {
  ttl: number
  version: number
  migrations: Record<number, Migration>
}

const unwrap = <T>(data: T): Unwrap<T>|Promise<Unwrap<T>> => {
  if (typeof data !== 'function') {
    return data as Unwrap<T>
  }

  return data()
}

type NotUndefined<T> = T extends undefined ? never : T

export const wrap = (storage: StorageLike)  => {
  const get = <V extends unknown>(key: string) => storage.get(key).then(v => v[key] as V|undefined)
  const set = <K extends string, V>(key: K, value: NotUndefined<V>) => storage.set({ [key]: value })
  const remove = (key: string) => storage.remove(key)
  const getByteUsed = (key: string) => storage.getBytesInUse(key)

  const watch = <V>(key: string, handler: (value: V, old: V|undefined) => any) => {
    const target = storage.onChanged

    const listener = (event: { [key: string]: chrome.storage.StorageChange }) => {
      if (key in event) {
        handler(event[key].newValue, event[key].oldValue)
      }
    }

    target.addListener(listener)

    return () => target.hasListener(listener) && target.removeListener(listener)
  }

  return { get, set, remove, getByteUsed, watch }
}


export const storageOf = (storage: StorageLike, metaKey: string) => {
  const repo = wrap(storage)

  const item = <T, M extends Pair = Pair>(key: string, init: T, meta?: M & Partial<MetaOption>) => {
    type Value = Unwrap<T>
    type ReturnReset = T extends GenericFunc 
      ? ReturnType<T> extends Promise<infer P> ? Promise<P> : Value
      : Value

    let $value: Value

    const setup = (async () => {
      const record = await storage.get(key)

      if (key in record) {
        $value = record[key] === null ? undefined : record[key]
      } else {
        $value = await unwrap(init)
        repo.set(key, $value === undefined ? null : $value)
      }

      repo.watch(key, (item?: Value) => $value = item!)

      if (! meta?.migrations) {
        return
      }
    })()

    const write = (item: Value) => setup.then(() => {
      $value = item

      return repo.set(key, $value === undefined ? null : $value)
    })

    const read = () => setup.then(() => $value)

    const reset = (): ReturnReset => {
      const origin = unwrap(init)

      if (! (origin instanceof Promise)) {
        write(origin)
        return origin as any
      }

      return origin.then(write).then(() => origin) as any
    }

    const subscribe = (subscriber: (value: Value, old: Value|undefined) => unknown) => {
      return repo.watch(key, subscriber)
    }

    const size = async () => repo.getByteUsed(key)

    return {
      subscribe,
      read,
      reset,
      write,
      size,
      get ready() { return setup },
      get value() { return $value },
      set value(data) { write(data) },
    }
  }

  return { ...repo, item }
}