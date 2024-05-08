import fs from 'fs/promises'
import path from 'path'
import {defineVitePlugin, invokeOnce, mkdir} from '~/bundler/helper.ts'
import type {GeneralManifest} from '~/bundler/browsers/manifest.ts'
import type {ViteDevServer} from "vite";
import {DevServer} from "~/bundler/plugins/BuildEnv.ts";

export default defineVitePlugin((manifest: GeneralManifest) => {
  let dir: string

  manifest.web_accessible_resources ??= []

  manifest.web_accessible_resources.push({
    matches: ['<all_urls>'],
    resources: ['shared/*', 'entries/*']
  })

  const writeManifest = async (outdir?: string) => {
    const location = outdir ?? dir ?? 'dist'
    const target = path.join(location, 'manifest.json')

    await mkdir(location)

    await fs.writeFile(target, JSON.stringify(manifest, null, 2))
  }

  const write = () => writeManifest()

  const configureServer = invokeOnce((server: ViteDevServer) => {
    const port = server.config.server.port

    manifest.host_permissions ??= []
  
    manifest.host_permissions.push(`http://localhost:${port}/*`)
    manifest.web_accessible_resources!.push({
      matches: ['<all_urls>'],
      resources: ['/*']
    })
  })

  return {
    name: 'amber:manifest-writer',
    writeManifest,
    configureServer,

    writeBundle: () => {
      DevServer.value && configureServer(DevServer.value)

      return write()
    }
  }
})