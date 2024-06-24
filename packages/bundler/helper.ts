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
  const Obj extends Record<any, any>,
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

export const hash = (text: string) => {
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

/**
 * insert backslash before white space
 * to escape path for linux-like environment
 */
export const escapeExecutePath = (path: string) => {
  const normalizePath = (path: string) => {
    if (process.platform === 'win32') {
      return path.replace(/\//, '\\')
    }
  
    return path.replace(/\\/g, '/')
  }

  path = normalizePath(path)

  if (process.platform !== 'win32') {
    return path.split(' ').join('\\ ')
  }

  if (path.search(/\s/) !== -1) {
    return `"${path}"`
  }

  return path;
}