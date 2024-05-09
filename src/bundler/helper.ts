import { mkdir as MakeDirectory, access } from 'fs/promises'
import type { GenericFunc, Prettify } from './type'
import type {PluginOption} from 'vite'

export const mkdir = async (path: string) => {
  try {
    return await MakeDirectory(path, { recursive: true })
  } catch {
    // shhhh
  }
}

/**
 * Check if given path is existed (file/folder)
 */
export const exists = async (path: string) => {
  try {
    return await access(path).then(() => true)
  } catch {
    return false
  }
}

export const version = (version: string = '1.0.0') => {
  const [major, minor, patch, label = '0'] = version
    .replace(/[^\d.-]+/g, '')
    .split(/[.-]/)

  const short = [major, minor, patch].filter(Boolean).join('.')
  const full = [major, minor, patch, label].filter(Boolean).join('.')

  return { short, full: full }
}

export const pick = <
  Obj extends Record<any, unknown>,
  const Keys extends Array<keyof Obj>
>(obj: Obj, ...keys: Keys) => {
  type PickedKey = typeof keys[number]

  const out: Prettify<Pick<Obj, PickedKey>> = {} as any

  for (const key of keys) {
    out[key] = obj[key]
  }

  return out
}

export const defineVitePlugin = <const A extends any[]>(option: GenericFunc<A, PluginOption>) => option

export const pathDiscover = (path: string) => {
  const explode = path.split('/')

  const filename = explode.pop()
  
  const dir = explode.join('/')
  const names = filename?.split('.')
  const ext = names?.pop()
  const name = names?.join('.')

  return { dir, filename, name, ext }
}

export const invokeOnce = <A extends any[], R>(handler: GenericFunc<A, R>) => {

  let isCalled = false

  return (...args: A) => {
    if (isCalled) {
      return undefined
    }

    isCalled = true

    return handler(...args)
  }
}
