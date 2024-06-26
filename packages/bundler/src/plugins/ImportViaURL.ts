import { code } from '../../../amber/src/hashing/Hash'
import { defineVitePlugin, exists, mkdir } from '../helper'
import fs from 'fs/promises'
import { join } from 'path'

const parseURL = (path: string) => {
  try {
    const url = new URL(path)

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url
    }
  } catch {
    return undefined
  }

  return undefined
}

export default defineVitePlugin(async () => {
  const base = join('.amber', 'cache')
  await mkdir(base)

  return {
    name: 'amber:import-url',
    enforce: 'pre',

    async resolveId(source) {
      const url = parseURL(source)

      if (!url) {
        return
      }

      const saveFromURL = async (url: URL) => {
        const response = await fetch(url.toString())
        const filename = url.pathname.split('/').pop()
        const target = `${code(url.toString())}-${filename}`

        if (await exists(join(base, target))) {
          this.debug('Cache hit ' + url)
          return `.amber/cache/${target}`
        }
    
        this.info('Downloading ' + url)
        await fs.writeFile(join(base, target), await response.text())
        this.info('Downloaded ' + url)
    
        return `.amber/cache/${target}`
      }

      return this.resolve(await saveFromURL(url))
    }
  }
})