export { defineConfig } from '~/bundler/configure'
export { version } from '~/bundler/helper'
import ContentScript from '~/bundler/components/ContentScript'
import Page from '~/bundler/components/Page'
import BackgroundScript from '~/bundler/components/BackgroundScript'
import Icons from '~/bundler/components/Icons'

export {
  ContentScript,
  Page,
  BackgroundScript,
  Icons
}