import { code } from '../../../amber/src/hashing/Hash'
import { defineVitePlugin, exists, mkdir } from '../helper'
import fs from 'fs/promises'
import { join } from 'path'
import ts from 'typescript'

const parseURL = (path: string) => {
  const [signature, ...fragments] = path.split(':')

  if (signature !== 'url') {
    return
  }

  try {
    const url = new URL(fragments.join(':'))

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url
    }

  } catch {
    return
  }

  return
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
      skipLibCheck: true,
      resolvePackageJsonImports: true
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
        const cacheFileName = url.searchParams.get('amber-cache')

        url.searchParams.delete('amber-cache')

        const filename = cacheFileName ?? url.pathname.split('/').pop()
        const target = `${code(url.toString())}-${filename}`
        const filepath = join(base, target)

        if (await exists(filepath)) {
          this.debug('Cache hit ' + url)
          return `.amber/cache/${target}`
        }

        this.info('Downloading ' + url)
        const response = await fetch(url.toString())
          .catch(e => { throw new Error('Failed to download module: ' + url, { cause: e }) })

        await fs.writeFile(filepath, new Uint8Array(await response.arrayBuffer()))
        this.info('Downloaded ' + url)

        compile(filepath, (text) => {
          const declaration = [
            `declare module ${JSON.stringify(source)} {`,
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