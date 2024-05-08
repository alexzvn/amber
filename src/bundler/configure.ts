import {type UserConfig} from 'vite'
import type {GeneralManifest} from '~/bundler/browsers/manifest'

export type ExtensionOptions = {
  devManifest?: Partial<GeneralManifest>
  manifest: GeneralManifest
  vite?: UserConfig
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
  }
}

export type DefinedConfig = ReturnType<typeof defineConfig>