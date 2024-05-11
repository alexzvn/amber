import {type UserConfig} from 'vite'
import type {GeneralManifest} from '~/bundler/browsers/manifest'

export type AmberConfig = {
  /**
   * Inject additional script to background worker to
   * bypass CSP on browsers, usefull in development
   * process when content script execute in main world.
   *
   * @see [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
   *
   * @default false
   */
  bypassCSP: boolean

  /**
   * Enable full reload a page with content script in HMR mode
   * If you don't want full reload by content script just
   * set it to false
   * 
   * @default true
   */
  autoReloadPage: boolean
}

export type AmberOptions = Partial<AmberConfig>

export type ExtensionOptions = {
  devManifest?: Partial<GeneralManifest>
  manifest: GeneralManifest
  vite?: UserConfig
  amber?: AmberOptions
}

export const defineConfig = (options: ExtensionOptions) => {
  const {
    vite = {},
    devManifest = {},
    manifest
  } = options


  return {
    vite,
    manifest,
    devManifest,
    amber: options.amber || {}
  }
}

export type DefinedConfig = ReturnType<typeof defineConfig>