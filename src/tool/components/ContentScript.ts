import type {ChromeBrowserManifest, Matches} from '~/tool/browsers/chrome'
import type {RequireAtLeastOne, Str, Unpacked} from '~/tool/type'
import {pathDiscover, pick} from '~/tool/helper'
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
}

export default class ContentScript {
  static readonly $registers: ContentScript[] = []

  public readonly path: ReturnType<typeof pathDiscover>

  public readonly options: Option

  constructor(
    public readonly file: string,
    options: Partial<Option> & { matches: Matches }
  ) {
    options.assetDir ??= 'assets'
    options.scriptDir ??= 'scripts'

    this.options = options as any

    this.path = pathDiscover(file)
    ContentScript.$registers.push(this)
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
}