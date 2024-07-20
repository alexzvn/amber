import { defineConfig, mergeConfig, type UserConfig } from 'vite'
import dotenv from 'dotenv'
import { loadAmberConfig } from '../program'
import defu from 'defu'
import AmberPlugin from '~/plugins'
import { getDevMapModule } from '~/components'
import ContentScript from '~/components/ContentScript'
import { exists, mkdir } from '~/helper'
import fs from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'
import mitt, { type Emitter } from 'mitt'

export const resolveConfig = async () => {
  dotenv.config({ override: true })

  const config = await loadAmberConfig()
  Object.assign(config.manifest, defu(config.manifest, config.devManifest))

  let vite: UserConfig = defineConfig({
    plugins: [AmberPlugin(config.manifest, config.amber)],
    build: {
      sourcemap: false,
      minify: false,
      emptyOutDir: false,
      rollupOptions: {
        input: getDevMapModule(),
        output: {
          entryFileNames: 'entries/[name].js',
          chunkFileNames: 'shared/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      }
    },
    server: {
      host: 'localhost',
      port: 5173,
      hmr: {
        host: 'localhost',
        port: 5173
      },
      watch: {
        ignored: ['**/dist/**']
      },
      warmup: {
        clientFiles: [
          ...ContentScript.$registers.map(script => script.file)
        ]
      }
    }
  })

  vite = mergeConfig(vite, config.vite);
  Object.assign(vite.server!.hmr as any, {
    host: vite.server!.host,
    port: vite.server!.port
  })

  return { vite, config }
}

type SessionEvent = {
  restart: void
}

export class Session <T extends Record<any, unknown> = Record<any, unknown>> {
  readonly path: string
  readonly id: string
  readonly emitter: Emitter<SessionEvent>

  data: T = {} as T

  constructor(id?: string) {
    this.emitter = mitt()

    if (!id) {
      id = process.env.AMBER_SESSION_ID ?? randomBytes(8).toString('hex')
      process.env.AMBER_SESSION_ID ??= id
    }

    this.id = id
    this.path = join('.amber/cache', `${this.id}.json`)
  }

  /**
   * Load session from file (if exists) or create new one
   */
  async init() {
    await mkdir('.amber/cache')


    if (await exists(this.path)) {
      return this.data = await fs.readFile(this.path)
        .then(buffer => JSON.parse(buffer.toString()))
        .catch(() => ({}))
    }
  }

  async save() {
    await fs.writeFile(this.path, JSON.stringify(this.data, null, 2))
  }

  /**
   * Destroy develop session
   */
  async destroy() {
    this.data = {} as T

    await fs.rm(this.path, { force: true })
  }
}