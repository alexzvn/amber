/**
 * Hand-written in-memory fakes for the slice of the `chrome.*` extension API
 * that `@amber.js/core` touches. Shared across the test suite so every file
 * exercises the same semantics (onChanged firing, sendMessage/onMessage
 * routing, etc).
 */

type StorageChange = { newValue?: unknown, oldValue?: unknown }
type StorageChangeListener = (changes: Record<string, StorageChange>) => void

/** In-memory stand-in for a single `chrome.storage.StorageArea`. */
export class FakeStorageArea {
  readonly data: Record<string, unknown> = {}

  private readonly listeners = new Set<StorageChangeListener>()

  async get(key: string): Promise<Record<string, unknown>> {
    return key in this.data ? { [key]: this.data[key] } : {}
  }

  async set(values: Record<string, unknown>): Promise<void> {
    const changes: Record<string, StorageChange> = {}

    for (const [key, newValue] of Object.entries(values)) {
      const oldValue = this.data[key]
      this.data[key] = newValue
      changes[key] = { newValue, oldValue }
    }

    this.fire(changes)
  }

  async remove(key: string): Promise<void> {
    if (!(key in this.data)) {
      return
    }

    const oldValue = this.data[key]
    delete this.data[key]
    this.fire({ [key]: { oldValue } })
  }

  async getBytesInUse(key: string): Promise<number> {
    return JSON.stringify(this.data[key] ?? null).length
  }

  readonly onChanged = {
    addListener: (fn: StorageChangeListener) => this.listeners.add(fn),
    removeListener: (fn: StorageChangeListener) => this.listeners.delete(fn),
    hasListener: (fn: StorageChangeListener) => this.listeners.has(fn),
  }

  private fire(changes: Record<string, StorageChange>) {
    for (const listener of [...this.listeners]) {
      listener(changes)
    }
  }
}

export const createFakeStorageArea = () => new FakeStorageArea()

/**
 * `storageOf()`/`wrap()` are typed against the full `chrome.storage.StorageArea`
 * (which also carries sync+callback overloads and a full `Event`-shaped
 * `onChanged`); `FakeStorageArea` deliberately only implements the
 * promise-returning calls `@amber.js/core` actually makes. Narrow,
 * well-justified boundary cast rather than reimplementing the unused overloads.
 */
export const asStorageArea = (area: FakeStorageArea): chrome.storage.StorageArea =>
  area as unknown as chrome.storage.StorageArea

/** Extension origin shared by the fake `chrome.runtime` and the `withMode` helper below. */
export const TEST_ORIGIN = 'chrome-extension://test-extension-id'

/** Mirrors the three arguments a real `chrome.runtime.onMessage` listener receives. */
type RuntimeSender = { tab?: { id: number } }
type RuntimeListener = (msg: unknown, sender: RuntimeSender, sendResponse: (v: unknown) => void) => unknown

export type FakeMessagingChrome = {
  runtime: {
    getURL: (path: string) => string
    onMessage: {
      addListener: (fn: RuntimeListener) => void
      removeListener: (fn: RuntimeListener) => void
      hasListener: (fn: RuntimeListener) => boolean
    }
    sendMessage: (msg: unknown) => Promise<unknown>
  }
  tabs: {
    sendMessage: (tabId: number, msg: unknown) => Promise<unknown>
    query: () => Promise<unknown[]>
    onUpdated: {
      addListener: () => void
      removeListener: () => void
    }
  }
}

/**
 * Fake `chrome.runtime` + `chrome.tabs` wired so that both `runtime.sendMessage`
 * and `tabs.sendMessage` dispatch to the same `onMessage` listener set, mirroring
 * how a real extension's background/content/ui contexts all ultimately share one
 * `chrome.runtime.onMessage` channel (tab-originated messages just carry `sender.tab`).
 */
export const createFakeMessagingChrome = (origin: string = TEST_ORIGIN): FakeMessagingChrome => {
  const listeners = new Set<RuntimeListener>()

  const dispatch = (msg: unknown, sender: RuntimeSender): Promise<unknown> => {
    const { promise, resolve } = Promise.withResolvers<unknown>()

    let responded = false
    let willRespondAsync = false

    const sendResponse = (data: unknown) => {
      if (responded) return
      responded = true
      resolve(data)
    }

    for (const listener of [...listeners]) {
      if (listener(msg, sender, sendResponse) === true) {
        willRespondAsync = true
      }
    }

    if (!willRespondAsync && !responded) {
      resolve(undefined)
    }

    return promise
  }

  return {
    runtime: {
      getURL: (path: string) => `${origin}${path.startsWith('/') ? path : `/${path}`}`,
      onMessage: {
        addListener: (fn) => { listeners.add(fn) },
        removeListener: (fn) => { listeners.delete(fn) },
        hasListener: (fn) => listeners.has(fn),
      },
      sendMessage: (msg) => dispatch(msg, {}),
    },
    tabs: {
      sendMessage: (tabId, msg) => dispatch(msg, { tab: { id: tabId } }),
      query: async () => [],
      onUpdated: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
  }
}

type Surface = 'background' | 'ui' | 'content'

/** The minimal `window` shape `getMode()` (MessageMisc.ts) actually reads. */
type MinimalWindow = { location: { href: string } }

/** Lets test code install fakes on `globalThis.chrome`/`globalThis.window` without `any`. */
type TestGlobal = {
  window?: Window & typeof globalThis
  chrome?: typeof chrome
}

const testGlobal = globalThis as unknown as TestGlobal

export const installFakeChrome = (fake: FakeMessagingChrome | { storage: unknown }) => {
  // The fakes only implement the subset of the `chrome` namespace the source under test touches.
  testGlobal.chrome = fake as unknown as typeof chrome
}

/**
 * `Messaging`'s accept mode is derived from `globalThis.window` at construction
 * time (`getMode()` in MessageMisc.ts). This runs `build()` with `window` set up
 * to produce the requested surface, then restores whatever was there before.
 */
export const withMode = <T>(mode: Surface, origin: string, build: () => T): T => {
  const hadWindow = 'window' in globalThis
  const previous = testGlobal.window

  if (mode === 'background') {
    delete testGlobal.window
  } else {
    const href = mode === 'ui' ? `${origin}/index.html` : 'https://content-page.example.com/'
    const stub: MinimalWindow = { location: { href } }
    // `window` is the full DOM `Window` type; only `.location.href` is ever read here.
    testGlobal.window = stub as unknown as Window & typeof globalThis
  }

  try {
    return build()
  } finally {
    if (hadWindow) {
      testGlobal.window = previous
    } else {
      delete testGlobal.window
    }
  }
}
