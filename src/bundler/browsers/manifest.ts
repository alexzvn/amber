import type {Prettify, Unpacked} from '~/bundler/type'
import type {ChromeBrowserManifest} from '~/bundler/browsers/chrome'
import type ContentScript from '~/bundler/components/ContentScript'
import type Page from "~/bundler/components/Page"
import type BackgroundScript from '~/bundler/components/BackgroundScript'
import type Icons from '../components/Icons'

type CBM = ChromeBrowserManifest

type CS = Unpacked<NonNullable<ChromeBrowserManifest['content_scripts']>>

export type GeneralManifest = Prettify<CBM> & Prettify<{
  content_scripts?: Array<CS|ContentScript>
  options_page?: string|Page
  action?: { default_popup?: Page }
  background?: ChromeBrowserManifest['background'] | BackgroundScript
  icons: ChromeBrowserManifest['icons']|Icons
}>
