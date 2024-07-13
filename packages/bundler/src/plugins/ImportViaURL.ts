import { code } from '../../../amber/src/hashing/Hash'
import { defineVitePlugin, exists, mkdir } from '../helper'
import fs from 'fs/promises'
import { join } from 'path'
import ts from 'typescript'

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

const tab = (source: string, size = 2) => {
  const space = ' '.repeat(size)

  return source.split('\n').map(line => space + line).join('\n')
}

/**
 * compile dts
 */
const compile = (filepath: string, callback: (dts: string) => unknown) => {
  const extensions = ['.js', '.ts', '.mjs', '.mts', '.cts']

  const isCompatible = extensions.some(ext => filepath.endsWith(ext))
  const empty = [
    'const content: any',
    'export default content'
  ].join('\n')

  if (!isCompatible) {
    return callback(tab(empty, 4))
  }

  const compiler = ts.createProgram({
    rootNames: [filepath],
    options: {
      allowJs: true,
      emitDeclarationOnly: true,
      declaration: true,
      checkJs: false,
      resolveJsonModule: true,
      esModuleInterop: true,
    }
  })

  compiler.emit(undefined, (_, text) => callback(tab(text, 4)))
}

export default defineVitePlugin(async () => {
  const base = join('.amber', 'cache')
  const typing = join('.amber', 'types')
  await mkdir(base)
  await mkdir(typing)

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
        const filepath = join(base, target)

        if (await exists(filepath)) {
          this.debug('Cache hit ' + url)
          return `.amber/cache/${target}`
        }

        this.info('Downloading ' + url)
        await fs.writeFile(filepath, await response.text())
        this.info('Downloaded ' + url)

        compile(filepath, (text) => {
          const declaration = [
            `declare module ${JSON.stringify(url)} {`,
            text,
            `}`
          ]
  
          fs.writeFile(join(typing, `${target}.d.ts`), declaration.join('\n'))
        })

        return `.amber/cache/${target}`
      }

      return this.resolve(await saveFromURL(url))
    }
  }
})