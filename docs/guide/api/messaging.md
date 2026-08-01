---
title: Messaging
outline: deep
---

# Messaging

`Messaging` is typed message passing between the background worker, content
scripts, and extension pages. You declare handlers on one side, export the
channel's *type*, and the other side gets full signatures and return types at
the call site.

```sh
npm install @amber.js/core
```

Three kinds of endpoint, differing in what comes back:

| Kind | Declared with | Called with | Returns |
| --- | --- | --- | --- |
| **Event** | `.on()` / `.once()` | `.emit()` | Nothing — fire and forget |
| **Handler** | `.handle()` | `.send()` | The handler's return value |
| **Stream** | `.stream()` | `.requestStream()` | An async iterable of yielded values |

## Declaring a channel

Create a `Messaging` instance in the context that owns the logic, chain your
endpoints onto it, and export its type.

```ts twoslash
import { Messaging } from '@amber.js/core'

const channel = new Messaging()
  .handle('math.add', (a: number, b: number) => a + b)
  .handle('user.load', async (id: number) => ({ id, name: 'Ada' }))
  .on('log', (message: string) => console.log(message))

export type BackgroundChannel = typeof channel
```

The instance detects its own context at construction — background if there is
no `window`, page if the origin is the extension's own, content script
otherwise. You never declare which one you are in.

> [!IMPORTANT]
> Export the **type**, not the instance. Importing the instance across contexts
> would pull the background worker's code into your content script bundle.
> `import type` is erased at build time; only the signatures cross the boundary.

## Calling from another context

```ts twoslash
// @filename: background.ts
import { Messaging } from '@amber.js/core'

const channel = new Messaging()
  .handle('math.add', (a: number, b: number) => a + b)
  .handle('user.load', async (id: number) => ({ id, name: 'Ada' }))

export type BackgroundChannel = typeof channel

// @filename: content.ts
// ---cut---
import { Messaging } from '@amber.js/core'
import type { BackgroundChannel } from './background'

const background = Messaging.getBackgroundChannel<BackgroundChannel>()

const sum = await background.send('math.add', 1, 2)
//    ^?

const user = await background.send('user.load', 1)
//    ^?
```

`send` awaits the handler's return value, unwrapping promises — an `async`
handler returning `Promise<User>` gives you `User`.

Three static accessors, one per target context:

```ts twoslash
import { Messaging } from '@amber.js/core'
// ---cut---
Messaging.getBackgroundChannel() // the service worker
Messaging.getUIChannel()         // extension pages: popup, options
Messaging.getContentChannel()    // content scripts — needs a tab
```

## Events

Events have no reply. Use them for notifications.

```ts twoslash
// @filename: content.ts
import { Messaging } from '@amber.js/core'

const channel = new Messaging()
  .on('data', (data: string) => console.log('Received: ' + data))

export type ContentChannel = typeof channel

// @filename: background.ts
// ---cut---
import { Messaging } from '@amber.js/core'
import type { ContentChannel } from './content'

const content = Messaging.getContentChannel<ContentChannel>()

setInterval(() => {
  content.emitActiveTab('data', 'tick')
}, 3_000)
```

`.once()` registers a handler that fires a single time. `.off()` removes one.

## Talking to content scripts requires a tab

The background worker has one instance; content scripts have one *per tab*. So
`ContentChannel` methods take a `tabId` first:

```ts twoslash
// @filename: content.ts
import { Messaging } from '@amber.js/core'

const channel = new Messaging()
  .handle('page.title', () => document.title)

export type ContentChannel = typeof channel

// @filename: background.ts
// ---cut---
import { Messaging } from '@amber.js/core'
import type { ContentChannel } from './content'

const content = Messaging.getContentChannel<ContentChannel>()

const title = await content.send(42, 'page.title')
```

For the common case of "whichever tab the user is looking at", use the
`ActiveTab` variants, which resolve the tab for you:

| Targeted | Active tab |
| --- | --- |
| `content.emit(tabId, ...)` | `content.emitActiveTab(...)` |
| `content.send(tabId, ...)` | `content.sendActiveTab(...)` |
| `content.requestStream(tabId, ...)` | `content.requestStreamActiveTab(...)` |

## Streams

A stream handler is an async generator. The caller gets an async iterable, so
values arrive as they are produced rather than in one batch.

```ts twoslash
// @filename: background.ts
import { Messaging, Misc } from '@amber.js/core'

const channel = new Messaging()
  .stream('random.number', async function* () {
    let i = 10

    while (i --> 0) {
      yield Math.random()
      await Misc.sleep(1000)
    }
  })

export type BackgroundChannel = typeof channel

// @filename: content.ts
// ---cut---
import { Messaging } from '@amber.js/core'
import type { BackgroundChannel } from './background'

const background = Messaging.getBackgroundChannel<BackgroundChannel>()

const stream = await background.requestStream('random.number')

for await (const chunk of stream) {
  console.log(chunk)
}
```

Useful for progress reporting, incremental results, or anything long-running
where you don't want the caller blocked until the end.

## Calling your own handlers

`self` invokes endpoints registered on the *same* instance directly, with no
round trip through the messaging layer. Handy for reusing logic and for tests.

Note the verbs differ from a remote channel: `self.handle(name, ...)` *calls* a
handler and returns its value synchronously, and `self.emit(name, ...)` fires
local event listeners.

```ts twoslash
import { Messaging } from '@amber.js/core'

const channel = new Messaging()
  .handle('math.add', (a: number, b: number) => a + b)

const sum = channel.self.handle('math.add', 1, 2)
//    ^?
```

## Composing with addons

`defineMessagingAddon` packages a group of related endpoints so they can be
registered onto a channel while keeping their types. Use it to split a large
channel across modules.

```ts twoslash
// @filename: auth.ts
import { Messaging, defineMessagingAddon } from '@amber.js/core'

export const authAddon = defineMessagingAddon((messaging: Messaging) =>
  messaging
    .handle('auth.login', async (token: string) => ({ token, ok: true }))
    .handle('auth.logout', async () => true)
)

// @filename: background.ts
// ---cut---
import { Messaging } from '@amber.js/core'
import { authAddon } from './auth'

const channel = new Messaging()
  .handle('math.add', (a: number, b: number) => a + b)
  .use(authAddon)

export type BackgroundChannel = typeof channel
```

The resulting type includes both the local handlers and the addon's.

## Notes and limits

- **Handler names are unique.** Registering the same name twice on one instance
  throws `Handler <name> already exists`. Pass `true` as the third argument to
  `handle` or `stream` to replace deliberately.
- **Payloads must be structured-cloneable.** Messages cross a process boundary,
  so functions, DOM nodes, and class instances do not survive. Plain data does.
- **The worker may be asleep.** Sending to the background worker wakes it; a
  first call after idle can be slower.
- **Errors propagate.** A handler that throws rejects the caller's `send`.
