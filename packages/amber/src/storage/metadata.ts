import { storageOf, wrap, type Pair } from './wrapper'

type ItemMeta<K extends Pair = Pair> = Pair & {
  __$initialized?: boolean
  __$expires?: number
  __$version?: number
}

type MetaContainer = Record<string, ItemMeta|undefined>

export const createMetadataRepository = (type: string) => {
  let container: MetaContainer
  const KEY = `$amber:storage.meta.${type}`
  const local = wrap(chrome.storage.local)

  const setup = (async () => {
    container = await local.get<MetaContainer>(KEY).then(async data => {
      !data && await local.set(KEY, {})
      return data ?? {}
    })

    local.watch<MetaContainer>(KEY, value => container = value ?? {})
  })()

  const save = () => local.set(KEY, container)

  const get = (key: string) => setup.then(() => container[key])
  const remove = (key: string) => setup.then(() => {
    if (key in container) {
      delete container[key]
      return save()
    }
  })

  const set = (key: string, meta: Pair) => setup.then(() => {
    const target = container[key] ??= {}
    Object.assign(target, meta)

    for (const [key, value] of Object.entries(target)) {
      if (value === undefined) {
        delete target[key]
      }
    }

    return save()
  })

  return { get, set, remove }
}