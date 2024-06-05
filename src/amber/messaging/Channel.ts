import { isPayload, makePayload, MessagingError, convertToEvent } from './MessageMisc'
import type { AcceptMode, MessagingPayload, Pair, AsyncReadableStream, ValueOfStreamHandler } from './MessageMisc'
import type Messaging from './Messaging'
import type { GenericFunc } from '~/amber/type'

export type AsyncReadableStreamEvent<T> = AsyncReadableStream<T> & ReturnType<typeof convertToEvent<T>>

type EventName<T extends Pair> = keyof Exclude<T, symbol>
type Str = string & {}
type FindCallable<T, K> = K extends keyof T ? T[K] : GenericFunc
type ParamOf<V> = V extends GenericFunc ? Parameters<V> : unknown[]
type InvokeReturn<V> = V extends GenericFunc
  ? (ReturnType<V> extends Promise<any> ? Awaited<ReturnType<V>>: ReturnType<V>)
  : unknown

class ChannelError extends Error {}

export class Channel<Target extends Messaging = Messaging> {
  constructor(public readonly target: Exclude<AcceptMode, 'content'>) {}

  emit<
    const Key extends EventName<Target['map']['events']>|Str,
    const Params extends ParamOf<FindCallable<Target['map']['events'], Key>>
  >(key: Key, ...args: Params): Promise<void> {
    return chrome.runtime.sendMessage(makePayload({
      name: key as string,
      accept: this.target,
      data: args as any,
      type: 'emit'
    }))
  }

  async send<
    const Key extends EventName<Target['map']['handlers']>|Str,
    const Func extends FindCallable<Target['map']['handlers'], Key>
  >(event: Key, ...args: ParamOf<Func>): Promise<InvokeReturn<Func>> {

    const payload: MessagingPayload = await chrome.runtime.sendMessage(makePayload({
      name: event as string,
      accept: this.target,
      type: 'request',
      data: args as any
    }))

    if (! isPayload(payload)) {
      throw new ChannelError(`Can't receive response from handler ${event.toString()}`)
    }

    if (payload.type === 'error') {
      const e = payload.data as any

      const error = new MessagingError(e as any)

      Object.defineProperty(error, 'stack', { value: e.stack })

      throw error
    }

    return payload.data as any
  }

  async requestStream<
    const Key extends EventName<Target['map']['streams']>|Str,
    const Func extends FindCallable<Target['map']['streams'], Key>
  >(event: Key, ...args: ParamOf<Func>): Promise<AsyncReadableStreamEvent<ValueOfStreamHandler<Func>>> {
    const payload = makePayload({
      accept: this.target,
      data: args as any,
      name: event as string,
      type: 'stream:request'
    })

    const data = await chrome.runtime.sendMessage(payload)

    if (! isPayload(data)) {
      throw new Error('Not found any stream handler for event ' + event.toString())
    }

    let controller: ReadableStreamDefaultController
    const messageListener = (msg: any) => {
      if (!isPayload(msg) || msg.id !== payload.id) {
        return
      }

      if (msg.type === 'stream:end') {
        controller.close()
      }

      if (msg.type === 'stream:data') {
        controller.enqueue(msg.data)
      }

      if (msg.type === 'stream:error') {
        const error = new MessagingError(msg.data as Error)

        // @ts-ignore
        Object.defineProperty(error, 'stack', { value: msg.data.stack })

        controller.error(error)
      }
    }

    const stream = new ReadableStream({
      start(_controller) {
        controller = _controller
        chrome.runtime.onMessage.addListener(messageListener)
      }
    }) as any

    return convertToEvent(stream as any)
  }
}

export class ContentChannel<Target extends Messaging = Messaging> {
  public readonly target: AcceptMode = 'content'

  emit<
    const Key extends EventName<Target['map']['events']>|Str,
    const Params extends ParamOf<FindCallable<Target['map']['events'], Key>>
  >(tabId: number, key: Key, ...args: Params): Promise<void> {
    return chrome.tabs.sendMessage(tabId, makePayload({
      name: key as string,
      accept: this.target,
      data: args as any,
      type: 'emit'
    }))
  }

  async send<
    const Key extends EventName<Target['map']['handlers']>|Str,
    const Func extends FindCallable<Target['map']['handlers'], Key>
  >(tabId: number, event: Key, ...args: ParamOf<Func>): Promise<InvokeReturn<Func>> {

    const payload: MessagingPayload = await chrome.tabs.sendMessage(tabId, makePayload({
      name: event as string,
      accept: this.target,
      type: 'request',
      data: args as any
    }))

    if (! isPayload(payload)) {
      throw new ChannelError(`Can't receive response from handler ${event.toString()}`)
    }

    if (payload.type === 'error') {
      const e = payload.data as any

      const error = new MessagingError(e as any)

      Object.defineProperty(error, 'stack', { value: e.stack })

      throw error
    }

    return payload.data as any
  }

  async requestStream<
    const Key extends EventName<Target['map']['streams']>|Str,
    const Func extends FindCallable<Target['map']['streams'], Key>
  >(tabId: number, event: Key, ...args: ParamOf<Func>): Promise<AsyncReadableStreamEvent<ValueOfStreamHandler<Func>>> {
    const payload = makePayload({
      accept: this.target,
      data: args as any,
      name: event as string,
      type: 'stream:request'
    })

    const data = await chrome.tabs.sendMessage(tabId, payload)

    if (! isPayload(data)) {
      throw new Error('Not found any stream handler for event ' + (event as string))
    }

    let controller: ReadableStreamDefaultController
    const messageListener = (msg: any) => {
      if (!isPayload(msg) || msg.id !== payload.id) {
        return
      }

      if (msg.type === 'stream:end') {
        controller.close()
      }

      if (msg.type === 'stream:data') {
        controller.enqueue(msg.data)
      }

      if (msg.type === 'stream:error') {
        const error = new MessagingError(msg.data as Error)

        // @ts-ignore
        Object.defineProperty(error, 'stack', { value: msg.data.stack })

        controller.error(error)
      }
    }

    const stream = new ReadableStream({
      start(_controller) {
        controller = _controller
        chrome.runtime.onMessage.addListener(messageListener)
      }
    }) as any

    return convertToEvent(stream as any)
  }

  async emitActiveTab<
    const Key extends EventName<Target['map']['events']>|Str,
    const Params extends ParamOf<FindCallable<Target['map']['events'], Key>>
  >(key: Key, ...args: Params) {
    const tab = await this.getActiveTab()

    if (tab.id) {
      return this.emit(tab.id, key, ...args)
    }
  }

  async sendActiveTab<
    const Key extends EventName<Target['map']['handlers']>|Str,
    const Func extends FindCallable<Target['map']['handlers'], Key>
  >(key: Key, ...args: ParamOf<Func>) {
    const tab = await this.getActiveTab()

    if (tab?.id) {
      return this.send(tab.id, key, ...args)
    }
  }

  async requestStreamActiveTab<
    const Key extends EventName<Target['map']['streams']>|Str,
    const Func extends FindCallable<Target['map']['streams'], Key>
  >(key: Key, ...args: ParamOf<Func>) {
    const tab = await this.getActiveTab()

    if (tab?.id) {
      return this.requestStream(tab.id, key, ...args)
    }
  }

  private async getActiveTab() {
    return await chrome.tabs.query({ active: true }).then(tabs => tabs[0])
  }
}