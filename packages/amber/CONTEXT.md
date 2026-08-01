# Runtime

The `@amber.js/core` library that extension authors import at runtime in their background, content, and UI scripts. It exists to give extensions a typed vocabulary for cross-surface messaging, persistent storage, DOM element waiting, queues, and hashing — independent of how the extension was built or scaffolded.

## Language

### Messaging

**Messaging**:
The runtime's central object for cross-surface communication. It is the typed registry of message keys — split into three slots: events, handlers, and streams — and the access point to a channel for each surface (`self`, `content`, `background`, `ui`).
_Avoid_: messaging channel, event bus

**AcceptMode**:
One of `background`, `content`, or `ui` — the three script surfaces of an extension. Every message is addressed to exactly one accept mode, and the runtime routes it to the scripts running in that surface.

**Channel**:
A typed, directional messaging endpoint that addresses one surface (`background` or `ui`). It is the extension author's handle for emitting events, sending requests, and requesting streams to scripts in that surface.
_Avoid_: message bus

**ContentChannel**:
The channel variant that targets the content script of a specific tab; it takes a `tabId`, and its `*ActiveTab` variants resolve the currently active tab first.

**SelfChannel**:
The in-process channel (`messaging.self`) that invokes the locally registered handlers directly, without a runtime round trip.

**MessagingPayload**:
The envelope of every message the runtime sends across surfaces: an id, the message name, the accept mode, a type, and the data, marked with a `__EMessage` flag that distinguishes the runtime's own messages from foreign ones.

**MessagingError**:
The error representation that crosses surfaces: a serializable wrapper around an original error, reconstructed (including its stack) on the receiving side.

**Stream handler**:
A handler registered with `stream()` that answers a `requestStream` call with a chunked sequence of values — an async iterable, generator, or array. The response is consumed as an `AsyncReadableStreamEvent`: a readable stream that is also async-iterable and exposes `on`/`off`/`all` events.

**defineMessagingAddon**:
A typed function that extends a `Messaging` instance with additional event/handler/stream maps and channel declarations, applied through `messaging.use()`.

### Storage

**Storage**:
The static wrapper over the browser's `chrome.storage` areas. It exposes the `local` area's operations directly (`get`, `set`, `remove`, `watch`, `getByteUsed`, `item`) and the `session`, `sync`, and `managed` areas as named objects.

**item**:
A stored value bound to a single storage key, carrying an initializer and optional metadata — migrations, ttl, version — plus a readiness promise before which the value must not be touched.
_Avoid_: key, setting

### Selector

**$ / $$**:
The single-element and multi-element selector shortcuts, each overloaded to search the whole document or only inside a given element.

**$.wait / $.any / $.sequence**:
The waiting selectors: `wait` resolves when a selector matches in the DOM (observing mutations until a timeout), `any` resolves with the first of several selectors to match and throws `SequenceError` if none ever do, and `sequence` resolves with the first match in the given order.

### Queue

**defineSimpleQueue**:
A factory for a queue that processes its items through an attached worker function with bounded concurrency, exposing push/prepend/stop and running state.

### Hashing

**Hash**:
The hashing module: `code` computes a 32-bit integer hash of a string, and `sha1`/`sha256`/`sha384`/`sha512` return hex digests of strings or binary data.
