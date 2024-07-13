import AdmZip from 'adm-zip'
import program from './program'
import { mkdir } from '../helper'
import { readFile } from 'fs/promises'
import { createWriteStream } from 'fs'
import { join } from 'path'

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

const gray = '\x1b[90m'
const green = '\x1b[32m'
const yellow = '\x1b[33m'

program.command('archive [name]')
.description('Zip dist folder to a file in release folder')
.option('--level <level>', 'Compression level', '9')
.option('--outDir <path>', 'Specify output folder other than release', 'release')
.action(async (name: string = '[name]-[version].[format]', opt) => {
  await mkdir(opt.outDir)

  const meta = await readFile('package.json')
  const pkg = JSON.parse(meta.toString())

  const zip = new AdmZip()
  zip.addLocalFolder('dist')
  const buffer = zip.toBuffer()


  const filename = name.replaceAll('[name]', pkg.name)
    .replaceAll('[version]', pkg.version)
    .replaceAll('[format]', 'zip')

  createWriteStream(join(opt.outDir, filename)).end(buffer)

  const output = [
    `Archive folder`,
    `${gray}dist ->`,
    `${green}release/${filename}`,
    `${yellow}${formatBytes(buffer.length)}`
  ]


  console.log()
  console.log(output.join(' '))
})