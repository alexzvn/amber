---
title: DOM & Utilities
outline: deep
---

# DOM & Utilities

The smaller helpers in `@amber.js/core`: DOM selection built for content
scripts, a concurrency-limited queue, hashing, and assorted functional
utilities.

```sh
npm install @amber.js/core
```

## Selectors

`$` and `$$` are typed shorthands for `querySelector` and `querySelectorAll`.
Known tag names infer their element type.

```ts twoslash
import { $, $$ } from '@amber.js/core'

const input = $('input')
//    ^?

const items = $$('li')

// Scoped to a parent element
const form = $('form')
const submit = form && $(form, 'button')
```

For an arbitrary selector, pass the element type yourself:

```ts twoslash
import { $ } from '@amber.js/core'
// ---cut---
const banner = $<HTMLDivElement>('.promo-banner')
```

These touch `document`, so they belong in content scripts and extension pages.
They throw in the background worker, which has no DOM.

### Waiting for elements

The reason this module exists. Content scripts run against pages you do not
control, where the element you need may not exist yet.
`$.wait` resolves once it appears, using a `MutationObserver` rather than
polling.

```ts twoslash
import { $ } from '@amber.js/core'
// ---cut---
const checkout = await $.wait('#checkout-button')
checkout.click()
```

| Option | Default | Effect |
| --- | --- | --- |
| `timeout` | `60_000` | Milliseconds before rejecting. |
| `target` | `document.body` | Subtree to observe. |
| `many` | `false` | Resolve with all matches instead of the first. |
| `throttle` | `200` | Throttle interval for the observer callback, in ms. |
| `observe` | `{ childList: true, subtree: true }` | Raw `MutationObserver` options. |

```ts twoslash
import { $ } from '@amber.js/core'
// ---cut---
const rows = await $.wait('table tr', {
  many: true,
  timeout: 5_000
})
```

A timeout rejects — wrap it if the element is genuinely optional.

### Coping with markup that varies

Sites change their DOM, and A/B tests mean two visitors can see different
markup. Two helpers take a list of candidate selectors:

```ts twoslash
import { $, SequenceError } from '@amber.js/core'
// ---cut---
// Race them — first to appear wins
const button = await $.any([
  '#checkout',
  '.checkout-btn',
  '[data-testid="checkout"]'
])

// Try in order — each waited on until it times out
const fallback = await $.sequence([
  '#checkout',
  '.checkout-btn'
])
```

| Helper | Strategy | On total failure |
| --- | --- | --- |
| `$.any` | All selectors raced concurrently | Throws `SequenceError` |
| `$.sequence` | One at a time, in priority order | Resolves `undefined` |

Prefer `$.any` when the variants are equally acceptable, `$.sequence` when the
first is genuinely preferred — but note `sequence` waits out the full timeout of
each failing selector before moving on, so keep its `timeout` short.

`SequenceError` carries the selectors that were tried:

```ts twoslash
import { $, SequenceError } from '@amber.js/core'
// ---cut---
try {
  await $.any(['#a', '#b'])
} catch (error) {
  if (error instanceof SequenceError) {
    console.warn('none matched', error.selectors)
  }
}
```

## Simple queue

`defineSimpleQueue` processes items with a bounded number of concurrent
workers. Use it for anything that would otherwise fire a hundred parallel
requests.

```ts twoslash
import { defineSimpleQueue } from '@amber.js/core'

const queue = defineSimpleQueue(async (url: string) => {
  const res = await fetch(url)
  console.log(res.status)
}, {
  concurrent: 3,
  onError: (error, url) => console.warn('failed', url, error)
})

queue.push('https://example.com/a', 'https://example.com/b')

await queue.executor
```

The queue starts as soon as something is pushed.

| Member | Behaviour |
| --- | --- |
| `push(...items)` | Append; starts the queue if idle. |
| `prepend(item)` | Jump the line. |
| `stop()` | Stop after in-flight jobs finish; returns the current run's promise. |
| `executor` | Promise resolving when the queue drains. |
| `isRunning` / `isStopped` | State flags. |
| `lines` | The pending array. |

`concurrent` defaults to `1` and must be a positive integer — anything else
throws immediately. A handler that rejects is routed to `onError`, and the
queue continues.

## Hashing

```ts twoslash
import { Hash } from '@amber.js/core'

const digest = await Hash.sha256('hello')
//    ^?

const fast = Hash.code('hello')
//    ^?
```

`sha1`, `sha256`, `sha384`, and `sha512` return lowercase hex strings and are
backed by the Web Crypto API. `code` is a synchronous 32-bit non-cryptographic
hash — fine for cache keys and change detection, never for security.

> [!WARNING]
> The SHA functions reach for `window.crypto` and therefore **throw in the
> background worker**, where there is no `window`. Hash in a content script or
> page, or call `crypto.subtle` directly in the worker.

## Misc

Small functional helpers, exported as a namespace.

```ts twoslash
import { Misc } from '@amber.js/core'

await Misc.sleep(500)
```

| Helper | Purpose |
| --- | --- |
| `sleep(ms)` | Promise resolving after a delay. |
| `invokeOnce(fn)` | Wrap a function so it runs once; later calls return the first result. |
| `safeCall(fn, onError?)` | Run a function, returning `undefined` instead of throwing. |
| `safeAsyncCall(fn, onError?)` | The async form. |
| `retries(times, fn)` | Retry until success or attempts run out; the handler receives the attempt number and previous error. |
| `tap(value, fn)` | Run a side effect and return the original value. |
| `pick(obj, ...keys)` | A typed subset of an object. |
| `panic(error)` | Throw from an expression position. |
| `base64ToBuffer` / `bufferToBase64` | Convert between base64 and `Uint8Array`. |
| `arrayBufferToBase64` | Encode an `ArrayBuffer` directly. |

```ts twoslash
import { Misc } from '@amber.js/core'
// ---cut---
const data = await Misc.retries(3, async (attempt) => {
  const res = await fetch('https://example.com/api')

  if (!res.ok) {
    throw new Error(`attempt ${attempt} failed`)
  }

  return res.json()
})
```

`invokeOnce` is the one to reach for when a content script may be injected more
than once into the same page:

```ts twoslash
import { Misc } from '@amber.js/core'
// ---cut---
const bootstrap = Misc.invokeOnce(() => {
  console.log('initialised')
  return true
})

bootstrap()
bootstrap() // no-op, returns the first result
```
