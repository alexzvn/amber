import fs from 'fs/promises'
import path from 'path'
import {defineVitePlugin, invokeOnce, mkdir} from '~/helper'
import type {GeneralManifest} from '~/browsers/manifest.ts'
import type {ViteDevServer} from "vite"
import {DevServer} from "~/plugins/BuildEnv.ts"
import type {AmberOptions} from "~/configure"
import BackgroundScript from '~/components/BackgroundScript'

const bindAccessibleResource = (manifest: GeneralManifest) => {
  const resources = (manifest.web_accessible_resources ??= [])
  const isMatchAll = resources.some(item => {
    if (!item.matches.includes('<all_urls>')) {
      return false
    }

    item.resources.push('shared/*', 'scripts/*')
    item.resources = [... new Set(item.resources)]

    return true
  })

  !isMatchAll && resources.push({
    matches: ['<all_urls>'],
    resources: ['shared/*', 'scripts/*']
  })
}

const bindBypassSCP = (manifest: GeneralManifest) => {
  const perms = new Set(manifest.permissions || [])

  perms.add('declarativeNetRequest')

  manifest.permissions = [...perms]
}

const injectBackgroundWorker = (manifest: GeneralManifest) => {
  if (manifest.background) {
    return
  }

  manifest.background = new BackgroundScript('@amber.js/bundler/client/worker.esm')
}

export default defineVitePlugin((manifest: GeneralManifest, amber: AmberOptions = {}) => {
  let dir: string|undefined = undefined

  bindAccessibleResource(manifest)
  amber.bypassCSP && bindBypassSCP(manifest)

  const writeManifest = async (outdir?: string) => {
    const location = outdir ?? dir ?? 'dist'
    const target = path.join(location, 'manifest.json')

    await mkdir(location)

    await fs.writeFile(target, JSON.stringify(manifest, null, 2))
  }

  return {
    name: 'amber:manifest-writer',
    configureServer: (server: ViteDevServer) => {
      const port = server.config.server.port
  
      manifest.host_permissions ??= []
    
      manifest.host_permissions.push(`http://localhost:${port}/*`)
      manifest.web_accessible_resources!.push({
        matches: ['<all_urls>'],
        resources: ['/*']
      })

      injectBackgroundWorker(manifest)

      writeManifest()
    },

    writeBundle: () => writeManifest()
  }
})