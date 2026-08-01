---
title: Storage
outline: deep
---

# Storage

`Storage` wraps `chrome.storage` with promises, types, change subscriptions, and
a reactive item wrapper. It works in every execution context — including the
background worker, which has no `localStorage`.

```sh
npm install @amber.js/core
```

## Direct access

The static methods operate on the **local** area.

```ts twoslash
import { Storage } from '@amber.js/core'

await Storage.set('token', 'abc123')

const token = await Storage.get<string>('token')
//    ^?


await Storage.remove('token')
```

| Method | Returns |
| --- | --- |
| `get<V>(key)` | `Promise<V \| undefined>` |
| `set(key, value)` | `Promise<void>` |
| `remove(key)` | `Promise<void>` |
| `getByteUsed(key)` | `Promise<number>` |
| `watch(key, handler)` | An unsubscribe function |
| `item(key, init, meta?)` | A reactive item — see below |

## Storage areas

Chrome offers four areas with different lifetimes and sync behaviour. `Storage`
exposes local directly and the other three as namespaces carrying the same API.

```ts twoslash
import { Storage } from '@amber.js/core'
// ---cut---
await Storage.set('a', 1)          // local  — persistent, this device
await Storage.session.set('b', 2)  // session — cleared when the browser closes
await Storage.sync.set('c', 3)     // sync    — synced to the user's account
const policy = await Storage.managed.get('d') // managed — read-only, set by admins
```

Pick deliberately: `sync` has tight quotas and is for user preferences, not
caches. `session` is the right place for tokens you don't want on disk.

## Watching for changes

`watch` fires whenever a key changes — including changes made in *another*
context, which is what makes it useful for keeping a popup in sync with the
worker.

```ts twoslash
import { Storage } from '@amber.js/core'
// ---cut---
const unwatch = Storage.watch<string>('token', (value, old) => {
  console.log('token changed', { value, old })
})

// later
unwatch()
```

Always call the returned function when the listener is no longer needed —
content scripts are re-injected on navigation and leaked listeners accumulate.

## Reactive items

`item` binds a key to a small object with a synchronous `value` property backed
by an async load. Use it when a piece of state is read often and you don't want
an `await` at every access.

```ts twoslash
import { Storage } from '@amber.js/core'

const counter = Storage.item('counter', 0)

// Wait for the first load before trusting `.value`
await counter.ready

console.log(counter.value) // 0

counter.value = 5          // writes through to storage
console.log(await counter.read())
```

On first use, the item reads the key. If it is absent, `init` is written as the
initial value. It then subscribes to changes, so `.value` stays current when
another context writes the same key.

| Member | Behaviour |
| --- | --- |
| `value` | Synchronous get/set. Reading before `ready` resolves gives `undefined`. |
| `ready` | Promise resolving once the initial load has completed. |
| `read()` | Awaits `ready`, then returns the current value. |
| `write(value)` | Awaits `ready`, then writes. |
| `reset()` | Restores `init`. |
| `subscribe(fn)` | Change callback; returns an unsubscribe function. |
| `size()` | Bytes used by this key. |

> [!IMPORTANT]
> `.value` is `undefined` until `ready` resolves. Either `await item.ready`
> once during startup, or use `await item.read()` at the call site.

### Lazy and async defaults

`init` may be a function, including an async one — it is only invoked when the
key is missing, so an expensive default costs nothing on subsequent loads.

```ts twoslash
import { Storage } from '@amber.js/core'
// ---cut---
const settings = Storage.item('settings', async () => {
  const res = await fetch('https://example.com/defaults.json')
  return res.json() as Promise<{ theme: string }>
})

await settings.ready
```

### `undefined` becomes `null`

`chrome.storage` cannot distinguish "key absent" from "key set to `undefined`",
which would make an item re-run its `init` forever. Amber stores `undefined` as
`null` and converts it back on read.

## Sharing state across contexts

Storage is the simplest way to share state between the worker, content scripts,
and pages — every context sees the same keys, and `watch` propagates changes
without any message passing.

```ts twoslash
// @filename: background.ts
import { Storage } from '@amber.js/core'

export const enabled = Storage.item('feature.enabled', true)

// @filename: content.ts
// ---cut---
import { Storage } from '@amber.js/core'

const enabled = Storage.item('feature.enabled', true)

enabled.subscribe((value) => {
  document.body.classList.toggle('feature-on', value)
})
```

Declaring the same key with the same default in both contexts is fine and
intentional — the second one to load finds the value already present.

For request/response work, or anything needing a return value, use
[Messaging](./messaging) instead.

> [!WARNING]
> `item` accepts `ttl`, `version`, and `migrations` metadata, but none of it is
> implemented — the values are stored and ignored. Do not rely on expiry or
> schema migration; version your keys manually if you need to change a shape.
