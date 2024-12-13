Messaging channel designed for easy to use, also it provide strong type system that enhance development experience. Below is an example how to setup messaging channel between background script and the content script.

:::code-group
```ts [background.ts] twoslash
import { Messaging } from '@amber.js/core'

const channel = new Messaging()
    .handle('math.add', (a: number, b: number) => a + b)

// export type for other scripts
export type BackgroundChannel = typeof channel
```

```ts [content.ts] twoslash
// @module: esnext
// @filename: background.ts
import { Messaging } from '@amber.js/core'

const channel = new Messaging()
    .handle('math.add', (a: number, b: number) => a + b)

export type BackgroundChannel = typeof channel

// @filename: content.ts
// ---cut---
import { Messaging } from '@amber.js/core'
import type { BackgroundChannel } from './background'

const background = Messaging.getBackgroundChannel<BackgroundChannel>()

const result = background.send('math.add', 1, 2)
//    ^?
```
:::

With messaging channel, you can also emit event from background script to content script.

:::code-group
```ts [content.ts]
import { Messaging } from '@amber.js/core'

const channel = new Messaging()
    .on('data', (data: string) => console.log('Received: ' + data))

export type ContentChannel = typeof channel
```

```ts [background.ts] twoslash
// @filename: content.ts
import { Messaging } from '@amber.js/core'

const channel = new Messaging()
    .on('data', (data: string) => console.log('Received: ' + data))

export type ContentChannel = typeof channel

// @filename: background.ts
// ---cut---
import { Messaging } from '@amber.js/core'
import type { ContentChannel } from 'content'

const content = Messaging.getContentChannel<ContentChannel>()

setInterval(() => {
    content.emitActiveTab('some data')
}, 3_000)

```
:::

For other process like streaming data, messaging api also support basic operator for data transportation.

:::code-group
```ts [content.ts] twoslash
import { Messaging, Misc } from '@amber.js/core'

const channel = new Messaging()
    .stream('random.number', async function * () {
        let i = 10

        while (i --> 0) {
            yield Math.random()
            await Misc.sleep(1000)
        }
    })

// export type for other scripts
export type BackgroundChannel = typeof channel

```

```ts [content.ts] twoslash
// @filename: background.ts
import { Messaging, Misc } from '@amber.js/core'

const channel = new Messaging()
    .stream('random.number', async function * () {
        let i = 10

        while (i --> 0) {
            yield Math.random()
            await Misc.sleep(1000)
        }
    })

// export type for other scripts
export type BackgroundChannel = typeof channel

// @filename: content.ts
// ---cut---
import { Messaging, Misc } from '@amber.js/core'
import type { BackgroundChannel } from 'background'

const background = Messaging.getBackgroundChannel<BackgroundChannel>()

const stream = await background.requestStream('random.number')

for await (const chunk of stream) {
    console.log(chunk)
}
```
:::