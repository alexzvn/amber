import mitt, { type Handler } from 'mitt'
import { invokeOnce } from '../misc/Misc.ts'

interface ValueChange<T> {
  value: T
  old?: T
}

type SubscriberHandler<T> = (changes: ValueChange<T>) => unknown

const setupGlobalEvent = (): ReturnType<typeof mitt> => {
  // @ts-ignore
  setup.cache ??= invokeOnce(() => {
    const emitter = mitt()

    chrome.storage.onChanged.addListener(changes => {
      for (const [key, { newValue, oldValue }] of Object.entries(changes)) {
        emitter.emit(key, { value: newValue, old: oldValue })
      }
    })

    return emitter
  })

  // @ts-ignore
  return setup.cache()
}

export const on = <T>(type: string, handler: SubscriberHandler<T>) => setupGlobalEvent().on(type, handler as any)

export const get = async <T>(key: string, fallback?: T) => {
  return chrome.storage.local.get(key).then(record => record[key] as T || fallback)
}
export const put = <T>(key: string, value: T) => {
  return chrome.storage.local.set({ [key]: value })
}

put.bulk = (data: Record<string, any>) => {
  return chrome.storage.local.set(data)
}

/**
 * Async reactive value from storage
 */
export const writable = <T>(key: string, start?: T) => {
  type Event = { change: { value?: T, old?: T } }
  type Subscriber = Handler<Event['change']>

  let _value: T|undefined = undefined
  const emitter = mitt<Event>()
  let skip = 0

  const ready = get(key).then((value) => {
    _value = value as T ?? start
    emitter.emit('change', { value: _value })
  })

  on(key, (record) => {
    _value = record.value as T

    if (skip <= 0) {
      emitter.emit('change', record as Event['change'])
      skip--
    }

    skip = skip < 0 ? 0 : skip
  })

  return {
    get ready () { return ready },
    get value () { return _value as T|undefined },
    set value (value) { put(key, _value = value) },

    subscribe: (subscriber: Subscriber) => {
      emitter.on('change', subscriber)

      return () => emitter.off('change', subscriber)
    },

    unsubscribe: (subscriber: Subscriber) => {
      emitter.off('change', subscriber)
    },

    /**
     * Silence update
     */
    $set: (value: T) => {
      skip++
      put(key, _value = value)
    }
  }
}

export const readonly = <T>(entry: string|ReturnType<typeof writable>, start?: T) => {
  const reactive = typeof entry === 'string' ? writable(entry, start) : entry

  return {
    get value() { return reactive.value },
    subscribe: reactive.subscribe,
    unsubscribe: reactive.unsubscribe
  }
}

export default {
  get,
  put,
  on,
  writable,
  readonly
}