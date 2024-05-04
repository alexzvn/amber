import {pathDiscover} from '~/development/helper.ts'

export default class Page {
  static readonly $registers = new Set<Page>()
  public readonly path: ReturnType<typeof pathDiscover>
  
  constructor(
    public readonly file: string,
    public readonly target?: string
  ) {
    this.path = pathDiscover(file)
    Page.$registers.add(this)
  }

  toJSON() {
    return this.target || this.file
  }
}