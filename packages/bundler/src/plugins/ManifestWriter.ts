import {defineVitePlugin, invokeOnce} from '~/helper'
import type {GeneralManifest} from '~/browsers/manifest.ts'
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

const bindBypassCSP = (manifest: GeneralManifest) => {
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

  const setup = invokeOnce((port: number) => {
    manifest.host_permissions ??= []

    manifest.host_permissions.push(`http://localhost:${port}/*`)
    manifest.web_accessible_resources!.push({
      matches: ['<all_urls>'],
      resources: ['/*']
    })

    injectBackgroundWorker(manifest)

    amber.bypassCSP && bindBypassCSP(manifest)
  })

  return {
    name: 'amber:manifest-writer',

    config() {
      bindAccessibleResource(manifest)
    },

    configResolved(config) {
      if (!config.mode.startsWith('dev')) return

      setup(config.server.port)
    },

    generateBundle() {
      if (manifest.host_permissions) {
        manifest.host_permissions = [...new Set(manifest.host_permissions)]
      }

      this.emitFile({
        fileName: 'manifest.json',
        type: 'asset',
        source: JSON.stringify(manifest, null, 2)
      })
    }
  }
})
