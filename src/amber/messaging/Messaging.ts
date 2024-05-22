import { Channel, ContentChannel } from './Channel'
import { registerEvent, registerHandler, registerStream } from './MessageHandler'
import type { EventKey, HandlerFunc, MapEvent, StreamHandlerFunc } from './MessageMisc'
import { convertToEvent, getMode } from './MessageMisc'

export const defineMessagingAddon = <
  T extends Messaging,
  R extends Messaging
>(callback: (messaging: T) => R) => callback

export default class Messaging<
  MapMessaging extends MapEvent = MapEvent,
  MapChannel extends { background: MapEvent, ui: MapEvent, content: MapEvent } =  { background: MapEvent, ui: MapEvent, content: MapEvent }
> {
  /**
   * This property only used for typescript mapping
   * Changing it's content has no effect
   */
  readonly map = {} as MapMessaging
  readonly _channel = {} as MapChannel
  private static _channel = {} as Record<string, Channel|ContentChannel>

  public static convertStreamToEvent = convertToEvent

  private readonly events = new Map<EventKey, HandlerFunc[]>()
  private readonly handlers = new Map<EventKey, HandlerFunc>()
  private readonly streams = new Map<EventKey, StreamHandlerFunc>()

  constructor() {
    const accept = getMode()
    console.log(accept)

    registerEvent(accept, this.events)
    registerHandler(accept, this.handlers)
    registerStream(accept, this.streams)
  }

  on<
    const Key extends EventKey,
    const Handler extends HandlerFunc
  >(event: Key, handler: Handler) {
    const handlers = this.events.get(event) ?? []

    handlers.push(handler)

    this.events.set(event, handlers)

    return this as unknown as Messaging<MapEvent<
      MapMessaging['events'] & Record<Key, Handler>,
      MapMessaging['handlers'],
      MapMessaging['streams']
    >, MapChannel>
  }

  off<
    const Key extends EventKey,
    const Handler extends HandlerFunc
  >(event: Key, handler: Handler) {
    const _handlers = this.events.get(event) ?? []
    const handlers = _handlers.filter(value => value !== handler)

    this.events.set(event, handlers)

    return this
  } 

  handle<
    const Key extends EventKey,
    const Handler extends HandlerFunc
  >(event: Key, handler: Handler, replace = false) {
    if (this.handlers.has(event) && !replace) {
      throw new Error(`Handler ${event} already exists`)
    }

    this.handlers.set(event, handler)

    return this as unknown as Messaging<MapEvent<
      MapMessaging['events'],
      MapMessaging['handlers'] & Record<Key, Handler>,
      MapMessaging['streams']
    >, MapChannel>
  }

  stream<
    const Key extends EventKey,
    const Handler extends StreamHandlerFunc
  >(event: Key, handler: Handler, replace = false) {
    if (this.streams.has(event) && !replace) {
      throw new Error(`Stream handler ${event} already exists`)
    }

    this.streams.set(event, handler)

    return this as unknown as Messaging<MapEvent<
      MapMessaging['events'],
      MapMessaging['handlers'],
      MapMessaging['streams'] & Record<Key, Handler>
    >, MapChannel>
  }

  use<
    const T extends Messaging,
    const R extends Messaging,
    const Addon extends typeof defineMessagingAddon<T, R>
  >(defineMessagingAddon: Addon): Messaging<MapEvent<
    MapMessaging['events'] & R['map']['events'],
    MapMessaging['handlers'] & R['map']['handlers'],
    MapMessaging['streams'] & R['map']['streams']
  >, R['_channel']> {
    return defineMessagingAddon(this as any) as any
  }

  typing<const M extends Messaging, const K extends 'ui'|'content'|'background'>() {
    return this as Messaging<MapMessaging, MapChannel & { [key in K]: M['map'] }>
  }

  get content() {
    return Messaging.getContentChannel() as ContentChannel<Messaging<MapChannel['content']>>
  }

  get background() {
    return Messaging.getBackgroundChannel() as Channel<Messaging<MapChannel['background']>>
  }

  get ui() {
    return Messaging.getUIChannel() as Channel<Messaging<MapChannel['ui']>>
  }

  public static getBackgroundChannel<M extends Messaging>() {
    const value = Messaging._channel['background'] ??= new Channel('background')

    return value as Channel<M>
  }

  public static getContentChannel<M extends Messaging>() {
    const value = Messaging._channel['content'] ??= new ContentChannel()

    return value as ContentChannel<M>
  }

  public static getUIChannel<M extends Messaging>() {
    const value = Messaging._channel['ui'] ??= new Channel('ui')

    return value as Channel<M>
  }
}