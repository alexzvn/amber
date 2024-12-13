import fs from 'fs/promises'
import { join } from 'path'
import { spawn } from 'node:child_process'
import ConfigTemplate from './template/config.ts.template?raw'
import BackgroundTemplate from './template/background.ts.template?raw'
import ContentScriptTemplate from './template/content-script.ts.template?raw'
import { access } from 'fs/promises'
import Json from 'comment-json'

const exists = async (path: string) => {
  try {
    return await access(path).then(() => true)
  } catch {
    return false
  }
}

const cwd = process.cwd()

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
      // adding import vite plugin
      code = text.split('\n').at(1) + '\n' + code

      const index = text.indexOf('defineConfig(')
      const configSection = text.slice(index)
        // remove defineConfig(...) wrapper
        .replace('defineConfig', '')
        .trim()
        .replace(/^\(/, '')
        .replace(/\)$/, '')
        // add padding
        .split('\n')
        .map(line => '  ' + line)
        .join('\n')
        .trim()

      code = code.replace(/__VITE__/g, `vite: ${configSection}`)

      return fs.rm(join(env.base, env.vite!))
    })

  code = code.replace(/__VITE__/g, '')

  return fs.writeFile(join(env.base, `amber.config.${env.mode}`), code)
}

const transformPackage = (_pkg: string, devBrowser: boolean) => {
  const pkg = JSON.parse(_pkg)

  pkg.description ??= 'A browser extension built with Vite + Amber'
  pkg.devDependencies ??= {}
  pkg.devDependencies['@amber.js/bundler'] = `^0.6.3`
  pkg.devDependencies['@amber.js/core'] = `^0.5.6`
  pkg.devDependencies['@types/chrome'] = '^0.0.287'

  pkg.scripts = {}

  if (devBrowser) {
    pkg.devDependencies['playwright'] = '^1.49.1'

    Object.assign(pkg.scripts, {
      prepare: 'playwright install',
      'dev:browser': 'amber dev --dev-browser'
    })
  }

  Object.assign(pkg.scripts, {
    dev: 'amber dev',
    build: 'amber build',
    archive: 'amber archive',
    clean: 'amber clean',
  })

  return pkg
}

export type CreateAmber = {
  folder: string
  devBrowser: boolean
}

const getTsconfigPath = async (folder: string) => {
  const files = [
    join(cwd, folder, 'tsconfig.app.json'),
    join(cwd, folder, 'tsconfig.json')
  ]

  for (const path of files) {
    if (await exists(path)) {
      return path
    }
  }

  return undefined
}

export const create = async (config: CreateAmber) => {
  const { folder } = config

  if (await exists(folder)) {
    console.log(`Folder ${folder} already existed`)
    process.exit(1)
  }

  const proc = spawn('npm create vite@latest ' + folder, {
    shell: true,
    env: process.env,
    stdio: [0, 1, 2]
  })

  await new Promise<number>(resolve => {
    proc.on('exit', resolve)
  })

  const packagePath = join(cwd, folder, 'package.json')
  const gitignore = join(cwd, folder, '.gitignore')
  const tsconfig = await getTsconfigPath(folder)

  const env = await getDevelopEnv(folder)

  await fs.readFile(packagePath)
    .then(buff => buff.toString())
    .then(text => transformPackage(text, config.devBrowser))
    .then(text => JSON.stringify(text, null, 2))
    .then(data => fs.writeFile(packagePath, data))

  await fs.readFile(gitignore)
    .then(buff => buff.toString())
    .then(text => ".amber\nrelease\n\n" + text)
    .then(data => fs.writeFile(gitignore, data))

  await transform(env)

  if (! tsconfig) {
    return
  }

  await fs.readFile(tsconfig)
    .then(buffer => Json.parse(buffer.toString()) as any)
    .then(config => {

      config.include?.push('.amber/types/*.ts')

      if (config.compilerOptions) {
        Json.assign(config.compilerOptions, { verbatimModuleSyntax: true })
      }

      return fs.writeFile(tsconfig, Json.stringify(config, null, 2))
    })
}