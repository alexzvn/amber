# @amber.js/core

Runtime library for Chrome MV3 extensions built with
[Amber.js](https://amber.alexzvn.me) — typed cross-context messaging, a promise
wrapper over `chrome.storage`, DOM helpers for content scripts, a bounded work
queue, and hashing.

```bash
npm install @amber.js/core
```

```ts
import { Messaging } from '@amber.js/core'

const channel = new Messaging()
  .handle('math.add', (a: number, b: number) => a + b)

export type BackgroundChannel = typeof channel
```

## Documentation

- [Messaging](https://amber.alexzvn.me/guide/api/messaging)
- [Storage](https://amber.alexzvn.me/guide/api/storage)
- [DOM & Utilities](https://amber.alexzvn.me/guide/api/dom-utilities)

## License

MIT
