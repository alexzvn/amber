import { join } from 'path'
import type { Sharp } from 'sharp'
import slash from 'slash'

type IconOption = {
  /**
   * Name of output image
   * 
   * @default icon
   */
  name: string

  /**
   * Output of processed images
   * 
   * @default assets
   */
  dir: string

  /**
   * @default {16, 32, 48, 128}
   */
  size: number[]

  postImageProcess?: (image: Sharp, size: number) => unknown
}

export default class Icons {
  static readonly $registers = new Set<Icons>
  public readonly config: IconOption

  constructor (
    public readonly file: string,
    option: Partial<IconOption> = {}
  ) {
    const {
      name = 'icon',
      dir = 'assets',
      size = [16, 32, 48, 128]
    } = option

    this.config = { ...option, dir, size, name }
    Icons.$registers.add(this)
  }

  setPostImageProcess(handler: NonNullable<IconOption['postImageProcess']>) {
    this.config.postImageProcess = handler
  }

  toJSON() {
    return this.config.size.reduce((carry, size) => {
      carry[`${size}`] = slash(join(this.config.dir, `${this.config.name}${size}.png`))

      return carry
    }, {} as Record<string, string>)
  }
}