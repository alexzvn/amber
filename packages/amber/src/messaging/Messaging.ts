import { Channel, ContentChannel, SelfChannel } from './Channel'
import { registerEvent, registerHandler, registerStream } from './MessageHandler'
import type { EventKey, HandlerFunc, MapEvent, StreamHandlerFunc } from './MessageMisc'
import { convertToEvent, getMode, OnceSymbol } from './MessageMisc'

export const defineMessagingAddon = <
  T extends Messaging,
  R extends Messaging
>(callback: (messaging: T) => R) => callback

type OtherChannel = { background: MapEvent, ui: MapEvent, content: MapEvent }
type MergeChannel<B extends MapEvent, U extends MapEvent, C extends MapEvent> = {
  background: B
  ui: U
  content: C
}

export default class Messaging<
  MapMessaging extends MapEvent = MapEvent,
  MapChannel extends OtherChannel = OtherChannel
> {
  /**
   * This property only used for typescript mapping
   * Changing it's content has no effect
   */
  readonly map = {} as MapMessaging
  readonly _channel = {} as MapChannel
  private static _channel = {} as Record<string, Channel|ContentChannel>

  public static convertStreamToEvent = convertToEvent

  private readonly events = new Map<EventKey, Set<HandlerFunc>>()
  private readonly handlers = new Map<EventKey, HandlerFunc>()
  private readonly streams = new Map<EventKey, StreamHandlerFunc>()

  constructor() {
    const accept = getMode()

    registerEvent(accept, this.events)
    registerHandler(accept, this.handlers)
    registerStream(accept, this.streams)
  }

  on<
    const Key extends EventKey,
    const Handler extends HandlerFunc
  >(event: Key, handler: Handler) {
    if (! this.events.has(event)) {
      this.events.set(event, new Set())
    }

    const handlers = this.events.get(event)!

    handlers.add(handler)

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
    const handlers = this.events.get(event)

    handlers?.delete(handler)

    return this
  }

  once<
    const Key extends EventKey,
    const Handler extends HandlerFunc
  >(event: Key, handler: Handler) {
    if (! this.events.has(event)) {
      this.events.set(event, new Set())
    }

    Object.assign(handler, { [OnceSymbol]: true })
    const handlers = this.events.get(event)!

    handlers.add(handler)

    return this as unknown as Messaging<MapEvent<
      MapMessaging['events'] & Record<Key, Handler>,
      MapMessaging['handlers'],
      MapMessaging['streams']
    >, MapChannel>
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
    const Addon extends ReturnType<typeof defineMessagingAddon>,
    const Return extends ReturnType<Addon>
  >(addon: Addon) {
    type M = Return['map']
    type C =  Return['_channel']

    return addon(this as any) as any as Messaging<
      MapEvent<
        MapMessaging['events'] & M['events'],
        MapMessaging['handlers'] & M['handlers'],
        MapMessaging['streams'] & M['streams']
      >,
      MergeChannel<
        MapChannel['background'] & C['background'],
        MapChannel['ui'] & C['ui'],
        MapChannel['content'] & C['content']
      >
    >
  }

  typing<const M extends Messaging, const K extends 'ui'|'content'|'background'>() {
    return this as Messaging<MapMessaging, MapChannel & { [key in K]: M['map'] }>
  }

  get self() {
    return new SelfChannel<typeof this>(
      this.events,
      this.handlers,
      this.streams
    )
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
