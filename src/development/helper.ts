import { mkdir as MakeDirectory } from 'fs/promises'
import type { Prettify } from './type'

export const mkdir = async (path: string) => {
  try {
    return await MakeDirectory(path)
  } catch {
    // shhhh
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


export const pathDiscover = (path: string) => {
  const explode = path.split('/')

  const filename = explode.pop()
  
  const dir = explode.join('/')
  const names = filename?.split('.')
  const ext = names?.pop()
  const name = names?.join('.')

  return { dir, filename, name, ext }
}