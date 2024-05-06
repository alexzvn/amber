import type {Unpacked} from '~/bundler/type'
import type {ChromeBrowserManifest} from '~/bundler/browsers/chrome'
import type ContentScript from '~/bundler/components/ContentScript'
import type Page from "~/bundler/components/Page"
import type BackgroundScript from '~/bundler/components/BackgroundScript'
import type Icons from '../components/Icons'


export type GeneralManifest = ChromeBrowserManifest & {
  content_scripts?: Array<Unpacked<ChromeBrowserManifest['content_scripts']>|ContentScript>
  background: ChromeBrowserManifest['content_scripts'] | BackgroundScript
  icons: ChromeBrowserManifest['content_scripts'] | Icons
}