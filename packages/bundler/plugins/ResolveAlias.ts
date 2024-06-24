import { defineVitePlugin } from '~/bundler/helper'
import ContentScript from '~/bundler/components/ContentScript'
import Background from '~/bundler/components/BackgroundScript'
import Page from '~/bundler/components/Page'
import { relative } from 'path'


export default defineVitePlugin(() => {
  const cwd = process.cwd()

  return {
    name: 'amber:resolve-alias',


    async buildStart() {
      const promises = [
        ... ContentScript.$registers,
        ... Background.$registers,
        ... Page.$registers
      ].map(async (entry) => {
        const { id } = await this.resolve(entry.file) || {}
        entry.file = !id ? entry.file : relative(cwd, id)
      })

      await Promise.all(promises)
    }
  }
})