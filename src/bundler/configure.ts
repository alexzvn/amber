import {type UserConfig, defineConfig as defineVite, mergeConfig} from 'vite'
import {join} from 'path'
import type {GeneralManifest} from '~/bundler/browsers/manifest'
import ContentScript from '~/bundler/components/ContentScript'
import Page from '~/bundler/components/Page'
import BackgroundScript from '~/bundler/components/BackgroundScript'
import program from './cli/program'

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