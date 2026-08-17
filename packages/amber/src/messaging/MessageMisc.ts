import mitt, {type Emitter} from 'mitt'
import type { GenericFunc } from '../type'

export type EventKey = string|number

export type StreamEvent = 'request'|'init'|'data'|'error'|'end'

export type AcceptMode = 'background'|'content'|'ui'

export type MessagingEvent<D> = {
  id: string|number
  name: string
  accept: AcceptMode
  type: 'emit'|'request'|'response'|'error'|`stream:${StreamEvent}`
  data: D
}

export type MessagingPayload<D = unknown> = { __EMessage: true } & MessagingEvent<D>

export const random = (): string => {
  if (typeof crypto !== 'undefined') {
    return crypto.randomUUID()
  }

  return (Math.random() + 1).toString(36).substring(2)
}

type MakePayload<D> = { id?: string|number } & Omit<MessagingEvent<D>, 'id'>

export const OnceSymbol = Symbol('invoke function once')

export const makePayload = <D>(data: MakePayload<D>): MessagingPayload<D> => {
  data.id ??= random()

  return { __EMessage: true, ...data } as any
}

/**
 * Chrome messaging JSON round-trips the payload, and JSON turns an `undefined`
 * array element into `null` while simply dropping an `undefined` object key.
 * Varargs travel as an array, so each one is boxed to keep `undefined` distinct
 * from `null` at every position: `['a', undefined]` ships as `[{v:'a'},{}]`.
 *
 * Only vararg arrays are boxed. Single-value `data` (`response`, `error`,
 * `stream:data`) already survives as an object property and must stay raw.
 * Boxing is shallow and does not make the transport lossless: `undefined` nested
 * inside an argument still becomes `null`, and a `Date` still arrives as a string.
 */
export const wrapArgs = (args: unknown[]): { v: unknown }[] => args.map(v => ({ v }))

export const unwrapArgs = (data: unknown): unknown[] => {
  // `data` of a vararg payload is always produced by `wrapArgs` on our side of the wire.
  const boxes = data as { v: unknown }[]

  return boxes.map(box => box.v)
}

export const isPayload = <D>(payload: any): payload is MessagingPayload<D> => {
  return payload && typeof payload === 'object' && '__EMessage' in payload && payload.__EMessage
}

export const getMode = (): AcceptMode => {
  if (typeof window === 'undefined') {
    return 'background'
  }

  const runtime = new URL(chrome.runtime.getURL('/'))
  const current = new URL(window.location.href)

  return runtime.origin === current.origin ? 'ui' : 'content'
}

export type Pair<K extends symbol = symbol, V = unknown> = Record<K, V>

type HandlerContext = {
  sender: chrome.runtime.MessageSender
}

interface StreamContext<E> extends HandlerContext {
  stream: WritableStreamDefaultWriter<E>
}

export type HandlerFunc<K extends any[] = any, R = any> = {
  (this: HandlerContext, ...args: K): R
  (...args: K): R
}

export type StreamHandlerFunc<K extends any[] = any, E = any, R = any> = {
  (this: StreamContext<E>, ...args: K): R
  (...args: K): R|AsyncGenerator<E, R>|Iterator<E>|R[]
}

type ExtractValueStream<R> = R extends AsyncGenerator<infer V> ? V :
  R extends Iterator<infer V> ? V :
  R extends Generator<infer V> ? V :
  R extends Array<infer V> ? V : unknown

export type ValueOfStream<T> = T extends GenericFunc<infer _, infer R>
  ?
    R extends Promise<infer V>
      ? ExtractValueStream<V>
      : ExtractValueStream<R>
  : unknown

export type ValueOfStreamHandler<T> = ValueOfStream<Awaited<T>> extends never ? unknown : ValueOfStream<Awaited<T>>

export type MapEvent<
  Events extends Pair = Pair,
  Handlers extends Pair = Pair,
  Streams extends Pair = Pair
> = {
  events: Events
  handlers: Handlers
  streams: Streams
}

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export class MessagingError extends Error {
  constructor (public readonly error: Error) {
    super(error.message)
  }

  toObject() {
    return {
      message: this.error.message,
      name: this.name,
      stack: this.stack
    }
  }
}

export type AsyncReadableStream<D> = ReadableStream<D> & { [Symbol.asyncIterator]: () => AsyncIterator<D> }

export const convertToEvent = <Chunk, Error = any>(stream: AsyncReadableStream<Chunk>) => {
  type Events ={
    data: Chunk
    error: Error
    close: void
  }

  const emitter = mitt<Events>()

  const listen = async () => {
    try {
      for await (const chunk of stream) {
        emitter.emit('data', chunk)
      }
    } catch (e) {
      emitter.emit('error', e as any)
    }

    emitter.emit('close')
  }

  let isRegister = false

  Object.assign(stream, {
    all: emitter.all,
    off: emitter.off,
    on: (key: any, cb: any) => {
      // lazy bind event
      if (!isRegister) {
        listen()
        isRegister = true
      }

      emitter.on(key, cb)
    }
  })

  return stream as AsyncReadableStream<Chunk> & Omit<Emitter<Events>, 'emit'>
}