import type {ChromeBrowserManifest, Matches} from '~/bundler/browsers/chrome'
import type {RequireAtLeastOne, Str, Unpacked} from '~/bundler/type'
import {pathDiscover, pick} from '~/bundler/helper'
import { join } from 'path'

type Option = NonNullable<Unpacked<ChromeBrowserManifest['content_scripts']>> & {
  /**
   * Enable/disable CSS code splitting. When enabled, CSS imported in async
   * JS chunks will be preserved as chunks and fetched together when the chunk
   * is fetched.
   * 
   * If disabled, all CSS in the entire project will be extracted into a single CSS file.
   * 
   * @default true
   */
  cssCodeSplit?: boolean

  /**
   * folder contain assets output file
   * 
   * @default assets
   */
  assetDir: string

  /**
   * folder contain scripts output file
   * 
   * @default scripts
   */
  scriptDir: string

  /**
   * Output build script format
   * 
   * @default es
   */
  format: 'es'|'iife'
}

export default class  ContentScript {
  static readonly $registers: ContentScript[] = []

  public readonly path: ReturnType<typeof pathDiscover>

  public readonly options: Option

  public readonly matches: string[]

  constructor(
    public file: string,
    options: Partial<Option> & { matches: Matches }
  ) {
    options.assetDir ??= 'assets'
    options.scriptDir ??= 'scripts'
    options.format ??= 'es'

    this.options = options as any
    this.matches = options.matches

    this.path = pathDiscover(file)
    ContentScript.$registers.push(this)
  }

  get moduleName() {
    return `${this.path.name}`
  }

  toJSON() {
    const { scriptDir, assetDir, cssCodeSplit } = this.options

    const extraCSS = cssCodeSplit !== false
      ? undefined
      : join(assetDir, this.path.name + '.css')

    const css = [this.options.css, extraCSS].filter(Boolean).flat() as string[]
    const js = [
      this.options.js,
      join(scriptDir, this.path.name + '.js')
    ]

    const options = pick(
      this.options,
      'matches',
      'run_at',
      'world',
      'match_about_blank',
      'match_origin_as_fallback'
    )

    return {
      ...options,
      js: js.filter(Boolean).flat(),
      css: css.length ? css: undefined
    }
  }

  static get map() {
    return this.$registers.reduce((carry, script) => {
      carry[script.moduleName] = script.file

      return carry
    }, {} as Record<string, string>)
  }
}