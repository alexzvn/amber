import slash from 'slash'
import {pathDiscover} from '~/bundler/helper'

export default class Page extends String {
  static readonly $registers = new Set<Page>()
  public readonly path: ReturnType<typeof pathDiscover>

  constructor(
    public file: string,
    public readonly target?: string
  ) {
    super()
    this.path = pathDiscover(file)
    Page.$registers.add(this)
  }

  toJSON() {
    return slash(this.target || this.file)
  }

  toString() {
    return this.toJSON()
  }

  static get map() {
    return [... this.$registers].reduce((carry, page) => {
      carry[page.path.name!] = page.file
      return carry
    }, {} as Record<string, string>)
  }
}