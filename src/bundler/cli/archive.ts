import archiver from 'archiver'
import program from './program'
import { mkdir } from '../helper'
import { readFile } from 'fs/promises'
import { createWriteStream } from 'fs'
import { join } from 'path'

program.command('archive [name]')
.description('Zip dist folder to a file in release folder')
.option('--level', 'Compression level', '9')
.option('--outDir', 'Specify output folder other than release', 'release')
.action(async (name: string = '[name]-[version].[format]', opt) => {
  await mkdir(opt.outDir)

  const meta = await readFile('package.json')
  const pkg = JSON.parse(meta.toString())
  const archive = archiver(opt.format, { zlib: { level: 9 } })

  const filename = name.replaceAll('[name]', pkg.name)
    .replaceAll('[version]', pkg.version)
    .replaceAll('[format]', 'zip')
  
  const stream = createWriteStream(join(opt.outDir, filename))

  archive.pipe(stream)
  archive.directory('dist', false)

  return archive.finalize()
})