import type {Unpacked} from '~/development/type'
import type {ChromeBrowserManifest} from '~/development/browsers/chrome.ts'
import type ContentScript from '~/development/components/ContentScript.ts'
import type Page from "~/development/components/Page.ts"
import type BackgroundScript from '~/development/components/BackgroundScript'
import type Icons from './components/Icons'


export type GeneralManifest = ChromeBrowserManifest | {
  content_scripts?: Array<Unpacked<ChromeBrowserManifest['content_scripts']>|ContentScript>
  options_page?: string|Page
  action?: { default_popup?: Page }
  background: ChromeBrowserManifest['content_scripts'] | BackgroundScript
  icons: ChromeBrowserManifest['content_scripts']|Icons
}