import { defineVitePlugin, invokeOnce } from '~/helper'
import sharp from 'sharp'
import { join } from 'path'
import Icons from '~/components/Icons'
import { mkdir } from '~/helper'

const resize = async (icon: Icons, cwd: string, outDir: string) => {
  const image = sharp(join(cwd, icon.file))

  await mkdir(join(outDir, icon.config.dir))

  for (const [size, path] of Object.entries(icon.toJSON())) {
    const img = image.clone()
      .rotate()
      .resize(+size, +size, { fit: 'inside' })

    icon.config.postImageProcess?.(img, +size)

    await img.toFile(join(outDir, path))
  }
}

const handle = async (cwd: string, outDir: string) => {
  for (const icon of Icons.$registers.values()) {
    await resize(icon, cwd, outDir)
  }
}

export default defineVitePlugin(async () => {
  const processIcon = invokeOnce(handle)

  return {
    name: 'amber:icon-generator',

    async configureServer() {
      await processIcon(process.cwd(), 'dist')
    },

    async buildStart() {
      await processIcon(process.cwd(), 'dist')
    }
  }
})