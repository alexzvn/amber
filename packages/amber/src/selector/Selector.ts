import { throttle as createThrottle } from 'throttle-debounce'

interface SelectorSingle {
  <const V extends Element>(selector: string): V|null
  <const K extends keyof HTMLElementTagNameMap>(element: Element, selector: K): HTMLElementTagNameMap[K]|null
  <const K extends keyof HTMLElementTagNameMap>(selector: K): HTMLElementTagNameMap[K]|null

  any: typeof any
  sequence: typeof sequence
  wait: typeof wait
}

interface SelectorMultiple {
  <const K extends keyof HTMLElementTagNameMap>(element: Element, selector: K): NodeListOf<HTMLElementTagNameMap[K]>
  <const K extends keyof HTMLElementTagNameMap>(selector: K): NodeListOf<HTMLElementTagNameMap[K]>
}

export const $: SelectorSingle = /* #__PURE__ */ ((a: Element|string, b?: string) => {
  if (typeof a !== 'string') {
    return a.querySelector(b!)
  }

  return document.querySelector(a)
}) as any

export const $$: SelectorMultiple = (a: Element|string, b?: string) => {
  if (typeof a !== 'string') {
    return a.querySelectorAll(b!)
  }

  return document.querySelectorAll(a)
}

type WaitSelectorOption = Partial<{
  /** @default 60_000 */
  timeout: number

  /** Parent element */
  target: Node|Element|HTMLElement

  /** Return as many elements match */
  many: boolean

  /**
   * set throttle if needed
   */
  throttle: number

  observe: MutationObserverInit
}>

const wait = async <
  const E extends HTMLElement,
  const O extends WaitSelectorOption = WaitSelectorOption
>(selector: string, options?: O) => {
  type ReturnElement = O['many'] extends true ? E[] : E

  const init = options || {} as O

  init.target ??= document.body
  init.timeout ??= 60_000
  init.throttle ??= 200
  init.observe ??= { childList: true, subtree: true }

  const target = typeof init.target === 'string' ? $(init.target) : init.target as HTMLElement

  if (! target) {
    throw new Error(`Target observe on "${target}" is empty`)
  }

  const element = await new Promise<HTMLElement>((ok, reject) => {
    const firstCheck = init.target ? target.querySelector<HTMLElement>(selector) : $<HTMLElement>(selector)

    if (firstCheck) {
      return ok(firstCheck)
    }

    let observer: MutationObserver

    const timer = init.timeout && setTimeout(() => {
      observer && observer.disconnect()
      reject(new Error('Timeout when waiting for selector ' + selector))
    }, init.timeout)

    const callback: MutationCallback = (_records, observer) => {
      const selection = init.target ? target.querySelector<HTMLElement>(selector) : $<HTMLElement>(selector)

      if (selection) {
        timer && clearTimeout(timer)
        observer.disconnect()
        ok(selection)
      }
    }

    observer = new MutationObserver(
      init.throttle ? createThrottle(init.throttle, callback) : callback
    )

    observer.observe(target, init.observe)
  })

  return (options?.many ? target.querySelectorAll(selector) : element) as ReturnElement
}

export class SequenceError extends Error {
  constructor(public readonly selectors: string[]) {
    super(`All selectors were failed to grab:\n${selectors.join('\n')}`)
  }
}

/**
 * Wait any element in DOM tree from selectors given
 */
const any = async <const O extends WaitSelectorOption>(selectors: string[], options?: O) => {
  return Promise.any(selectors.map(selector => wait(selector, options)))
    .catch(() => { throw new SequenceError(selectors) })
}

/**
 * Wait each element from selectors, if it's found then return
 */
const sequence = async <const O extends WaitSelectorOption>(selectors: string[], options?: O) => {
  for (const selector of selectors) {
    const node = await wait(selector, options).catch(() => undefined)

    if (node) {
      return node
    }
  }

  return undefined
}

$.wait = wait
$.any = any
$.sequence = sequence