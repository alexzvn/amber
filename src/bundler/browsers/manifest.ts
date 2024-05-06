import type {Prettify, Unpacked} from '~/bundler/type'
import type {ChromeBrowserManifest} from '~/bundler/browsers/chrome'
import type ContentScript from '~/bundler/components/ContentScript'
import type Page from "~/bundler/components/Page"
import type BackgroundScript from '~/bundler/components/BackgroundScript'
import type Icons from '../components/Icons'

type CBM<T extends keyof ChromeBrowserManifest> = NonNullable<ChromeBrowserManifest[T]>

type PartialManifest = Omit<
  ChromeBrowserManifest, 'icons'|'content_scripts'|'background'>

export type GeneralManifest = PartialManifest & Prettify<{
  content_scripts?: Array<Unpacked<CBM<'content_scripts'>>|ContentScript>
  options_page?: string|Page
  action?: { default_popup?: string|Page }
  background?: CBM<'background'> | BackgroundScript
  icons?: Icons|CBM<'icons'>
}> & Record<string, unknown>
