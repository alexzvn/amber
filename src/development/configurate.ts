import {type UserConfig, defineConfig as defineVite} from 'vite'
import defu from 'defu'
import {join} from 'path'
import type {GeneralManifest} from '~/development/manifest.ts'
import ViteExtensionPlugin from '~/ViteExtensionPlugin.ts'
import ContentScript from '~/development/components/ContentScript.ts'
import Page from '~/development/components/Page.ts'
import BackgroundScript from "~/development/components/BackgroundScript.ts";

type ExtensionOptions = {
  manifest: GeneralManifest
  vite?: UserConfig
}

export const defineConfig = (options: ExtensionOptions) => {
  const {
    manifest,
    vite = {},
  } = options

  const extension = ViteExtensionPlugin(manifest)

  const scripts = ContentScript.$registers.map(script => {
    const config = defu(vite, {
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

  const modules = defu(vite, {
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
    modules: Object.keys(inputModules).length ? modules : undefined,
    scripts: scripts.length ? scripts : undefined
  }
}

export type DefinedConfig = ReturnType<typeof defineConfig>