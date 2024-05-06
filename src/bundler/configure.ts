import {type UserConfig, defineConfig as defineVite, mergeConfig} from 'vite'
import {join} from 'path'
import type {GeneralManifest} from '~/bundler/browsers/manifest'
import ViteExtensionPlugin from '~/bundler/ViteExtensionPlugin'
import ContentScript from '~/bundler/components/ContentScript'
import Page from '~/bundler/components/Page'
import BackgroundScript from "~/bundler/components/BackgroundScript";

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
  const extension = ViteExtensionPlugin(manifest)

  const scripts = ContentScript.$registers.map(script => {
    const config = mergeConfig(vite, {
      plugins: [extension],
      build: {
        emptyOutDir: false,
        cssCodeSplit: false,
        rollupOptions: {
          input: script.file,
          output: {
            assetFileNames: join(script.options.assetDir, `${script.path.name}.[ext]`),
            format: 'iife',
            entryFileNames: join(script.options.scriptDir, '[name].js'),
          }
        }
      }
    })

    return defineVite(config as any)
  })

  const modules = mergeConfig(vite, {
    plugins: [extension],
    build: {
      emptyOutDir: false,
      external: 1,
      rollupOptions: {
        input: {},
        output: {
          entryFileNames: 'entries/[name].js',
          chunkFileNames: 'shared/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      }
    }
  })
  
  const inputModules = [
    ... Page.$registers.values(),
    ... BackgroundScript.$registers.values()
  ].reduce((carry, input) => {
    carry[input.path.name!] = input.file
    return carry
  }, {} as Record<string, unknown>)
  
  if (Object.keys(inputModules).length) {
    Object.assign(modules.build.rollupOptions.input, inputModules)
  }

  return {
    manifest,
    devManifest,
    modules: Object.keys(inputModules).length ? modules as UserConfig : undefined,
    scripts: scripts.length ? scripts : undefined
  }
}

export type DefinedConfig = ReturnType<typeof defineConfig>