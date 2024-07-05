import { defineVitePlugin } from '~/helper'
import ContentScript from '~/components/ContentScript'
import Background from '~/components/BackgroundScript'
import Page from '~/components/Page'
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