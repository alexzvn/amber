import { defineVitePlugin, mkdir } from '../helper'
import { join } from 'path'
import fs from 'fs/promises'
import dotenv from 'dotenv'

const content = `/// <reference types="vite/client" />
interface ImportMetaEnv {
  {__CONTENT__}
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}`


export default defineVitePlugin(async () => {
  const base = join('.amber', 'types')
  const file = join(base, 'env.d.ts')

  await mkdir(base)

  return {
    name: 'amber:emit-typescript-env',

    async watchChange(id) {
      const match = id.split('/').pop()

      if (! match || match !== '.env') {
        return
      }

      const env = dotenv.parse(await fs.readFile(id))

      const inject = Object.keys(env)
        .filter(key => key.startsWith('VITE_'))
        .map(key => ` readonly ${key}: string`)
        .join('\n')

      await fs.writeFile(file, content.replace(/{__CONTENT__}/, inject.trimStart()))
    },
  }
})