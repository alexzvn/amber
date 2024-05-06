import type {Unpacked} from '~/tool/type'
import type {ChromeBrowserManifest} from '~/tool/browsers/chrome'
import type ContentScript from '~/tool/components/ContentScript'
import type Page from "~/tool/components/Page"
import type BackgroundScript from '~/tool/components/BackgroundScript'
import type Icons from '../components/Icons'


export type GeneralManifest = ChromeBrowserManifest | {
  content_scripts?: Array<Unpacked<ChromeBrowserManifest['content_scripts']>|ContentScript>
  options_page?: string|Page
  action?: { default_popup?: Page }
  background: ChromeBrowserManifest['content_scripts'] | BackgroundScript
  icons: ChromeBrowserManifest['content_scripts']|Icons
}