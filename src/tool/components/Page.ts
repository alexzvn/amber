import {pathDiscover} from '~/tool/helper'

export default class Page extends String {
  static readonly $registers = new Set<Page>()
  public readonly path: ReturnType<typeof pathDiscover>

  constructor(
    public readonly file: string,
    public readonly target?: string
  ) {
    super()
    this.path = pathDiscover(file)
    Page.$registers.add(this)
  }

  toJSON() {
    return this.target || this.file
  }

  toString() {
    return this.toJSON()
  }
}