import {defineVitePlugin, invokeOnce} from '~/helper'
import type {GeneralManifest} from '~/browsers/manifest.ts'
import type {PluginOptions} from "~/configure"
import BackgroundScript from '~/components/BackgroundScript'
import {hasGeckoId, toFirefoxManifest} from '~/browsers/firefox'

// Build runs one plugin instance per pass over the same manifest; warn once per manifest.
const warnedGeckoId = new WeakSet<GeneralManifest>()

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

export default defineVitePlugin((manifest: GeneralManifest, amber: PluginOptions = {}) => {

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

      if (amber.browser !== 'firefox') {
        this.emitFile({
          fileName: 'manifest.json',
          type: 'asset',
          source: JSON.stringify(manifest, null, 2)
        })

        return
      }

      const firefox = toFirefoxManifest(JSON.parse(JSON.stringify(manifest)))

      if (!hasGeckoId(firefox) && !warnedGeckoId.has(manifest)) {
        warnedGeckoId.add(manifest)
        this.warn('manifest is missing `browser_specific_settings.gecko.id`; addons.mozilla.org requires it to sign Manifest V3 add-ons')
      }

      this.emitFile({
        fileName: 'manifest.json',
        type: 'asset',
        source: JSON.stringify(firefox, null, 2)
      })
    }
  }
})
