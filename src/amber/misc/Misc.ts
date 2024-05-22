import type { GenericFunc, Prettify } from '~/amber/type'
import { base64ArrayBuffer } from './ArrayBufferToBase64'

export const invokeOnce = <A extends any[], R>(handler: GenericFunc<A, R>) => {
  let isCalled = false
  let value: R

  return (...args: A) => {
    if (isCalled) {
      return value
    }

    isCalled = true

    return value = handler(...args)
  }
}

export const safeCall = <R, E = any>(handler: () => R, onError?: (error: E) => unknown): R|undefined => {
  try {
    return handler()
  } catch (e) {
    onError?.(e as any)
  }
}

export const safeAsyncCall = async <T, E, R>(handler: () => Promise<T>, onError?: (e: E) => R) => {
  try {
    return await handler()
  } catch (error) {
    return onError?.(error as E)
  }
}

export const tap = <T>(value: T, handler: (v: T) => unknown) => {
  handler(value)

  return value
}

export const retries = async <T>(times: number, handler: (attempt: number, previousError?: unknown) => Promise<T>): Promise<T> => {
  let error: unknown
  let attempt = 1

  do {
    try {
      return await handler(attempt++, error)
    } catch (e) {
      error = e
    }
  } while (times --> 0)

  throw error
}

export const base64ToBuffer = (base64: string) => {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}

export const bufferToBase64 = (buffer: Uint8Array) => {
  return base64ArrayBuffer(buffer as unknown as ArrayBuffer)
}

export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export const hashCode = (text: string) => {
  let hash = 0

  if (text.length === 0) {
    return hash
  }

  for (let i = 0; i < text.length; i++) {
    const chr = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr
    hash |= 0 // Convert to 32bit integer
  }

  return hash
}

export const pick = <const Obj extends Record<any, any>>(obj: Obj, ...keys: Array<keyof Obj>) => {
  type PickedKey = typeof keys[number]

  const out: Prettify<Pick<Obj, PickedKey>> = {} as any

  for (const key of keys) {
    out[key] = obj[key]
  }

  return out
}

export {
  base64ArrayBuffer as arrayBufferToBase64
}
