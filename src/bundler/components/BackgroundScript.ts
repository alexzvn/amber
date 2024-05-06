import {pathDiscover} from '~/bundler/helper'

export default class BackgroundScript {
  static readonly $registers = new Set<BackgroundScript>()

  public readonly path: ReturnType<typeof pathDiscover>

  constructor(public readonly file: string) {
    this.path = pathDiscover(file)

    BackgroundScript.$registers.add(this)
  }

  toJSON() {
    return {
      service_worker: 'entries/' + this.path.name + '.js',
      type: 'module'
    }
  }
}