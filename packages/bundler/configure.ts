import {type UserConfig} from 'vite'
import type {GeneralManifest} from '~/bundler/browsers/manifest'
import type {Match, Matches} from '~/bundler/browsers/chrome'

export type AmberConfig = {
  /**
   * Inject additional script to background worker to
   * bypass CSP on browsers, usefull in development
   * process when content script execute in main world.
   *
   * This only effect in development environment. Set `true`
   * to allow bypass any site or pass host permission string if
   * you want specify bypass on custom site.
   *
   * @see [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
   *
   * @default false
   */
  bypassCSP: boolean|Match|Matches
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