import type {Prettify, Unpacked} from '~/bundler/type'
import type {ChromeBrowserManifest} from '~/bundler/browsers/chrome'
import type ContentScript from '~/bundler/components/ContentScript'
import type Page from "~/bundler/components/Page"
import type BackgroundScript from '~/bundler/components/BackgroundScript'
import type Icons from '../components/Icons'

type PartialManifest = ChromeBrowserManifest

// export type GeneralManifest = ChromeBrowserManifest | {
//   content_scripts?: Array<Unpacked<ChromeBrowserManifest['content_scripts']>|ContentScript>
//   options_page?: string|Page
//   action?: { default_popup?: Page }
//   background?: ChromeBrowserManifest['content_scripts'] | BackgroundScript
//   icons: ChromeBrowserManifest['content_scripts']|Icons
// }

export type GeneralManifest = Prettify<PartialManifest> & {
  content_scripts?: Array<Unpacked<ChromeBrowserManifest['content_scripts']>|ContentScript>
  options_page?: string|Page
  action?: { default_popup?: Page }
  background?: ChromeBrowserManifest['content_scripts'] | BackgroundScript
  icons: ChromeBrowserManifest['content_scripts']|Icons
}
