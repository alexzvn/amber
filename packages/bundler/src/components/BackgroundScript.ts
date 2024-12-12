import {pathDiscover} from '~/helper'

type BackgroundOptions = Partial<{
  /**
   * @default true
   */
  autoReload: boolean
}>

export default class BackgroundScript {
  static readonly $registers = new Set<BackgroundScript>()

  public readonly path: ReturnType<typeof pathDiscover>

  constructor(public file: string, public options: BackgroundOptions = {}) {
    this.path = pathDiscover(file)
    this.options.autoReload ??= true

    BackgroundScript.$registers.add(this)
  }

  toJSON() {
    return {
      service_worker: 'entries/' + this.path.name + '.js',
      type: 'module'
    }
  }

  static get map() {
    return [... this.$registers].reduce((carry, script) => {
      carry[script.path.name!] = script.file
      return carry
    }, {} as Record<string, string>)
  }
}