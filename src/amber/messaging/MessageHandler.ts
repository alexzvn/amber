import { safeAsyncCall } from '~/amber/misc/Misc'
import type { AcceptMode, EventKey, HandlerFunc, MessagingPayload, StreamHandlerFunc } from './MessageMisc'
import { isPayload, MessagingError } from './MessageMisc'

export const registerEvent = (mode: AcceptMode, map: Map<EventKey, HandlerFunc[]>) => {
  chrome.runtime.onMessage.addListener((msg, sender) => {
    if (! isPayload(msg)) {
      return
    }

    const handlers = map.get(msg.name) || []

    if (msg.accept !== mode || msg.type !== 'emit' || !handlers.length) {
      return
    }

    for (const handler of handlers) {
      try {
        handler.call({ sender }, ...msg.data as any)
      } catch (e) {
        console.error(e)
      }
    }
  })
}

const asyncCall = <D>(handler: () => Promise<D>) => handler()


export const registerHandler = (mode: AcceptMode, map: Map<EventKey, HandlerFunc>) => {
  chrome.runtime.onMessage.addListener((msg, sender, response) => {
    if (! isPayload(msg)) {
      return
    }

    const handler = map.get(msg.name)

    if (msg.accept !== mode || msg.type !== 'request' || !handler) {
      return
    }

    asyncCall(async () => {
      try {
        msg.type = 'response'
        msg.data = await handler.call({ sender }, ...msg.data as any)

        response(msg)
      } catch (e) {
        msg.type = 'error'
        msg.data = new MessagingError(e as Error).toObject()

        response(msg)

        console.error(e)
      }
    })

    return true
  })
}

export const registerStream = (mode: AcceptMode, map: Map<EventKey, StreamHandlerFunc>) => {

  chrome.runtime.onMessage.addListener((msg, sender, response) => {
    if (! isPayload(msg)) {
      return
    }

    const handler = map.get(msg.name)

    if (msg.accept !== mode || msg.type !== 'stream:request' || !handler) {
      return
    }

    const emit = <D>(data: MessagingPayload<D>) => {
      return sender.tab
        ? chrome.tabs.sendMessage(sender.tab.id!, data)
        : chrome.runtime.sendMessage(data)
    }

    const args = msg.data as any[]

    const stream = new WritableStream({
      start() {
        msg.data = undefined
        msg.type = 'stream:init'
        response(msg)
      },

      write(chunk) {
        msg.type = 'stream:data'
        msg.data = chunk
        return emit(msg)
      },

      close() {
        msg.data = undefined
        msg.type = 'stream:end'
      },

      abort(reason) {
        msg.type = 'stream:error'
        msg.data = new MessagingError(new Error(reason || 'Messaging stream aborted'))
        return emit(msg)
      }
    })

    asyncCall(async () => {
      const writer = stream.getWriter()

      const value = await handler.call({ sender, stream: writer }, ...args as any)

      if (!value) {
        return
      }

      if (value[Symbol.iterator]) {
        for (const chunk of value) {
          await writer.write(chunk)
        }
      }

      if (value[Symbol.asyncIterator]) {
        for await (const chunk of value) {
          await writer.write(chunk)
        }
      }

      writer.close()
    })

    return true
  })

}