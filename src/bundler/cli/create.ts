import { cwd } from './program'
import fs from 'fs/promises'
import { join } from 'path'
import { spawn } from 'node:child_process'
import { exists } from '~/bundler/helper'
import { version as PackageVersion, name as PackageName } from '../../../package.json'
import ConfigTemplate from './template/config.ts.template?raw'
import BackgroundTemplate from './template/background.ts.template?raw'
import ContentScriptTemplate from './template/content-script.ts.template?raw'

const getDevelopEnv = async (folder: string) => {
  const base = join(cwd, folder)

  const mode = await exists(join(base, 'tsconfig.json')) ? 'ts' : 'js'
  const vite = await exists(join(base, `vite.config.${mode}`))

  return {
    base,
    mode,
    typescript: mode === 'ts',
    javascript: mode === 'js',
    vite: vite ? `vite.config.${mode}` : undefined
  }
}

const transform = async (env: Awaited<ReturnType<typeof getDevelopEnv>>) => {
  const cs = `src/content-script.${env.mode}`
  const bg = `src/background.${env.mode}`

  await fs.writeFile(join(env.base, bg), BackgroundTemplate)
  await fs.writeFile(join(env.base, cs), ContentScriptTemplate)


  let code = ConfigTemplate
    .replace(/__CONTENT_SCRIPT__/g, `'${cs}'`)
    .replace(/__BACKGROUND_SCRIPT__/g, `'${bg}'`)


  env.vite && await fs.readFile(join(env.base, env.vite!))
    .then(buff => buff.toString())
    .then(text => {
      const lines = text.split('\n')

      code = lines[1] + '\n' + code
      code = code.replace(/__VITE__/g, `vite: { ${lines[5].trim()} }`)

      return fs.rm(join(env.base, env.vite!))
    })

  code = code.replace(/__VITE__/g, '')

  return fs.writeFile(join(env.base, `amber.config.${env.mode}`), code)
}

const transformPackage = (_pkg: string) => {
  const pkg = JSON.parse(_pkg)

  pkg.description ??= ''
  pkg.devDependencies ??= {}
  pkg.devDependencies[PackageName] = `^${PackageVersion}`

  Object.assign(pkg.scripts, {
    clean: 'amber clean',
    dev: 'amber dev',
    build: 'amber build --prod'
  })

  delete pkg.scripts.preview

  return pkg
}

export const create = async (folder: string) => {
  if (await exists(folder)) {
    console.log(`Folder ${folder} already existed`)
    process.exit(1)
  }

  const proc = spawn('npm create vite@latest ' + folder, {
    shell: true,
    env: process.env,
    stdio: [0, 0, 0]
  })

  await new Promise<number>(resolve => {
    proc.on('exit', resolve)
  })

  const packagePath = join(cwd, folder, 'package.json')

  if (! await exists(packagePath)) {
    return process.exit(0)
  }

  const env = await getDevelopEnv(folder)
  let packageContent: any

  await fs.readFile(packagePath)
    .then(buff => buff.toString())
    .then(text => packageContent = transformPackage(text))
    .then(text => JSON.stringify(text, null, 2))
    .then(data => fs.writeFile(packagePath, data))

  await transform(env)
}