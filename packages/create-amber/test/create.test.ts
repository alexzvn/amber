import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import os from 'os'
import { join } from 'path'

// `create.ts` reads `const cwd = process.cwd()` once, at module-evaluation
// time, and resolves every path it touches against that captured value. To
// point it at a disposable sandbox we must `chdir` *before* the module is
// first imported, then import it dynamically.
const sandbox = await fs.mkdtemp(join(os.tmpdir(), 'create-amber-test-'))
const originalCwd = process.cwd()
process.chdir(sandbox)

// `create()` shells out to `npm create vite@latest ...` via `node:child_process`'s
// `spawn`. We replace that call with a fake scaffolder: instead of actually
// running npm, it materializes whatever fixture the current test registered
// at the target folder, then reports a clean exit - mirroring how the real
// `npm create vite` call populates the folder before create.ts post-processes it.
type FixtureWriter = (folder: string) => Promise<void>

let currentFixture: FixtureWriter = async () => {
  throw new Error('no fixture registered for this test')
}

mock.module('node:child_process', () => ({
  spawn: (_cmd: string, argv: string[]) => {
    const folder = argv[argv.length - 1]

    return {
      on(event: string, cb: (code: number) => void) {
        if (event !== 'exit') return
        currentFixture(folder).then(() => cb(0))
      },
    }
  },
}))
// Exception (ts-no-dynamic-import): `create.ts` captures `process.cwd()`
// into a module-level constant at evaluation time, and this suite also
// needs `mock.module('node:child_process', ...)` to register before that
// module body runs. A static top-level import would evaluate before the
// preceding `chdir`/`mock.module` calls take effect, so the import must be
// deferred until after both are in place.
const { create } = await import('../src/create')

afterAll(async () => {
  process.chdir(originalCwd)
  await fs.rm(sandbox, { recursive: true, force: true })
})

// ---- fixture builder -------------------------------------------------

type ProjectOptions = {
  mode: 'ts' | 'js'
  /** write a tsconfig.app.json alongside/instead of tsconfig.json */
  tsconfigApp?: boolean
  /** write a root tsconfig.json (defaults to true when mode === 'ts') */
  rootTsconfig?: boolean
  viteConfig?: string
  pkg?: Record<string, unknown>
  gitignore?: string
}

const basePackageJson = (overrides: Record<string, unknown> = {}) => ({
  name: 'fake-vite-project',
  private: true,
  version: '0.0.0',
  type: 'module',
  scripts: {
    dev: 'vite',
    build: 'vite build',
  },
  dependencies: {
    vue: '^3.4.0',
  },
  devDependencies: {
    vite: '^5.0.0',
  },
  ...overrides,
})

/** Writes a fake pre-scaffolded Vite project, as if `npm create vite` ran. */
async function writeFakeViteProject(base: string, opts: ProjectOptions) {
  await fs.mkdir(join(base, 'src'), { recursive: true })
  await fs.writeFile(
    join(base, 'package.json'),
    JSON.stringify(opts.pkg ?? basePackageJson(), null, 2),
  )
  await fs.writeFile(join(base, '.gitignore'), opts.gitignore ?? 'node_modules\ndist\n')

  const wantsRootTsconfig = opts.rootTsconfig ?? opts.mode === 'ts'

  if (wantsRootTsconfig) {
    await fs.writeFile(
      join(base, 'tsconfig.json'),
      JSON.stringify(
        {
          files: [],
          references: [{ path: './tsconfig.app.json' }],
        },
        null,
        2,
      ),
    )
  }

  if (opts.tsconfigApp) {
    await fs.writeFile(
      join(base, 'tsconfig.app.json'),
      JSON.stringify(
        {
          compilerOptions: { target: 'ES2020', strict: true },
          include: ['src'],
        },
        null,
        2,
      ),
    )
  }

  if (opts.viteConfig) {
    await fs.writeFile(join(base, `vite.config.${opts.mode}`), opts.viteConfig)
  }
}

function useFixture(base: string, opts: ProjectOptions) {
  currentFixture = async (folder) => {
    // `folder` arrives relative to `cwd`/sandbox; `base` is the absolute
    // path the test expects it at, so sanity-check they agree.
    expect(join(sandbox, folder)).toBe(base)
    await writeFakeViteProject(base, opts)
  }
}

let counter = 0
function freshFolder() {
  counter += 1
  const folder = `project-${counter}`
  return { folder, base: join(sandbox, folder) }
}

afterEach(async () => {
  currentFixture = async () => {
    throw new Error('no fixture registered for this test')
  }
})

const defaultViteConfig = [
  "import { defineConfig } from 'vite'",
  "import react from '@vitejs/plugin-react'",
  '',
  '// https://vite.dev/config/',
  'export default defineConfig({',
  '  plugins: [react()],',
  '})',
  '',
].join('\n')

// ---- mode detection ----------------------------------------------------

describe('mode detection', () => {
  test('detects ts mode and writes .ts scaffold files when tsconfig.json is present', async () => {
    const { folder, base } = freshFolder()
    useFixture(base, { mode: 'ts' })

    await create({ folder, devBrowser: false, template: 'vanilla-ts' })

    expect(existsSync(join(base, 'src/background.ts'))).toBe(true)
    expect(existsSync(join(base, 'src/content-script.ts'))).toBe(true)
    expect(existsSync(join(base, 'amber.config.ts'))).toBe(true)
    expect(existsSync(join(base, 'src/background.js'))).toBe(false)
    expect(existsSync(join(base, 'amber.config.js'))).toBe(false)
  })

  test('detects js mode and writes .js scaffold files when tsconfig.json is absent', async () => {
    const { folder, base } = freshFolder()
    useFixture(base, { mode: 'js', rootTsconfig: false })

    await create({ folder, devBrowser: false, template: 'vanilla' })

    expect(existsSync(join(base, 'src/background.js'))).toBe(true)
    expect(existsSync(join(base, 'src/content-script.js'))).toBe(true)
    expect(existsSync(join(base, 'amber.config.js'))).toBe(true)
    expect(existsSync(join(base, 'src/background.ts'))).toBe(false)
  })

  test('mode detection keys only on root tsconfig.json, independent of tsconfig.app.json', async () => {
    // A project that only has tsconfig.app.json (no root tsconfig.json) is
    // treated as JS mode for file extensions, even though a tsconfig file
    // exists and will still receive the amber include/verbatimModuleSyntax edit.
    const { folder, base } = freshFolder()
    useFixture(base, { mode: 'js', rootTsconfig: false, tsconfigApp: true })

    await create({ folder, devBrowser: false, template: 'vanilla' })

    expect(existsSync(join(base, 'src/background.js'))).toBe(true)
    expect(existsSync(join(base, 'amber.config.js'))).toBe(true)

    const appTsconfig = JSON.parse(await fs.readFile(join(base, 'tsconfig.app.json'), 'utf8'))
    expect(appTsconfig.include).toContain('.amber/types/*.ts')
    expect(appTsconfig.compilerOptions.verbatimModuleSyntax).toBe(true)
  })
})

// ---- placeholder substitution -------------------------------------------

describe('placeholder substitution', () => {
  test('replaces content-script/background placeholders with real paths and clears __VITE__ when there is no vite config', async () => {
    const { folder, base } = freshFolder()
    useFixture(base, { mode: 'ts' })

    await create({ folder, devBrowser: false, template: 'vanilla-ts' })

    const config = await fs.readFile(join(base, 'amber.config.ts'), 'utf8')

    expect(config).toContain("new ContentScript('src/content-script.ts'")
    expect(config).toContain("new BackgroundScript('src/background.ts')")
    expect(config).not.toContain('__CONTENT_SCRIPT__')
    expect(config).not.toContain('__BACKGROUND_SCRIPT__')
    expect(config).not.toContain('__VITE__')
    expect(config).not.toContain('vite:')
  })

  test('background and content-script files contain the verbatim template bodies', async () => {
    const { folder, base } = freshFolder()
    useFixture(base, { mode: 'js', rootTsconfig: false })

    await create({ folder, devBrowser: false, template: 'vanilla' })

    expect(await fs.readFile(join(base, 'src/background.js'), 'utf8')).toBe(
      "console.log('Hello from background')",
    )
    expect(await fs.readFile(join(base, 'src/content-script.js'), 'utf8')).toBe(
      "console.log('hello from content script')",
    )
  })
})

// ---- vite config folding -------------------------------------------------

describe('vite config folding', () => {
  test('folds an existing vite.config into amber.config as `vite:` and deletes the standalone file', async () => {
    const { folder, base } = freshFolder()
    useFixture(base, { mode: 'ts', viteConfig: defaultViteConfig })

    await create({ folder, devBrowser: false, template: 'react-ts' })

    expect(existsSync(join(base, 'vite.config.ts'))).toBe(false)

    const config = await fs.readFile(join(base, 'amber.config.ts'), 'utf8')
    // the plugin import line (2nd line of the source vite.config) is hoisted
    // to the top of the generated file
    expect(config.split('\n')[0]).toBe("import react from '@vitejs/plugin-react'")
    expect(config).toContain('vite: {')
    expect(config).toContain('plugins: [react()]')
  })

  test('leaves amber.config without a vite key when the project has no vite.config', async () => {
    const { folder, base } = freshFolder()
    useFixture(base, { mode: 'ts' })

    await create({ folder, devBrowser: false, template: 'vanilla-ts' })

    const config = await fs.readFile(join(base, 'amber.config.ts'), 'utf8')
    expect(config).not.toContain('vite:')
    expect(config.split('\n')[0]).toBe("import pkg from './package.json'")
  })
})

// ---- package transform -----------------------------------------------------

describe('package transform', () => {
  test('adds amber dependencies and resets scripts to dev/build/archive/clean', async () => {
    const { folder, base } = freshFolder()
    useFixture(base, { mode: 'ts' })

    await create({ folder, devBrowser: false, template: 'vanilla-ts' })

    const pkg = JSON.parse(await fs.readFile(join(base, 'package.json'), 'utf8'))

    expect(pkg.devDependencies['@amber.js/bundler']).toBe('^0.6.3')
    expect(pkg.devDependencies['@amber.js/core']).toBe('^0.5.6')
    expect(pkg.devDependencies['@types/chrome']).toBe('^0.0.287')
    expect(pkg.devDependencies['playwright']).toBeUndefined()

    // original vite-generated scripts are fully replaced, not merged
    expect(pkg.scripts).toEqual({
      dev: 'amber dev',
      build: 'amber build',
      archive: 'amber archive',
      clean: 'amber clean',
    })

    // original dependency/manifest fields are preserved
    expect(pkg.dependencies.vue).toBe('^3.4.0')
    expect(pkg.name).toBe('fake-vite-project')
  })

  test('defaults description only when the generated package.json has none', async () => {
    const { folder, base } = freshFolder()
    useFixture(base, { mode: 'ts', pkg: basePackageJson({ description: 'My own blurb' }) })

    await create({ folder, devBrowser: false, template: 'vanilla-ts' })

    const pkg = JSON.parse(await fs.readFile(join(base, 'package.json'), 'utf8'))
    expect(pkg.description).toBe('My own blurb')
  })

  test('applies a default description when missing', async () => {
    const { folder, base } = freshFolder()
    useFixture(base, { mode: 'ts' })

    await create({ folder, devBrowser: false, template: 'vanilla-ts' })

    const pkg = JSON.parse(await fs.readFile(join(base, 'package.json'), 'utf8'))
    expect(pkg.description).toBe('A browser extension built with Vite + Amber')
  })

  test('devBrowser=true adds playwright and the dev:browser/prepare scripts', async () => {
    const { folder, base } = freshFolder()
    useFixture(base, { mode: 'ts' })

    await create({ folder, devBrowser: true, template: 'vanilla-ts' })

    const pkg = JSON.parse(await fs.readFile(join(base, 'package.json'), 'utf8'))

    expect(pkg.devDependencies['playwright']).toBe('^1.49.1')
    expect(pkg.scripts).toEqual({
      prepare: 'playwright install',
      'dev:browser': 'amber dev --dev-browser',
      dev: 'amber dev',
      build: 'amber build',
      archive: 'amber archive',
      clean: 'amber clean',
    })
  })

  test('prepends .amber/release ignores to the existing .gitignore without discarding its content', async () => {
    const { folder, base } = freshFolder()
    useFixture(base, { mode: 'ts', gitignore: 'node_modules\ndist\n' })

    await create({ folder, devBrowser: false, template: 'vanilla-ts' })

    const gitignore = await fs.readFile(join(base, '.gitignore'), 'utf8')
    expect(gitignore).toBe('.amber\nrelease\n\nnode_modules\ndist\n')
  })
})

// ---- tsconfig edits ---------------------------------------------------------

describe('tsconfig edits', () => {
  test('appends the amber types glob and sets verbatimModuleSyntax on tsconfig.json', async () => {
    const { folder, base } = freshFolder()
    useFixture(base, { mode: 'ts' })

    await create({ folder, devBrowser: false, template: 'vanilla-ts' })

    const tsconfig = JSON.parse(await fs.readFile(join(base, 'tsconfig.json'), 'utf8'))
    // our fixture's root tsconfig.json has no `include` (project-references
    // style), so the optional push is a no-op and must not throw
    expect(tsconfig.include).toBeUndefined()
  })

  test('prefers tsconfig.app.json over tsconfig.json when both exist', async () => {
    const { folder, base } = freshFolder()
    useFixture(base, { mode: 'ts', tsconfigApp: true })

    await create({ folder, devBrowser: false, template: 'react-ts' })

    const appTsconfig = JSON.parse(await fs.readFile(join(base, 'tsconfig.app.json'), 'utf8'))
    expect(appTsconfig.include).toEqual(['src', '.amber/types/*.ts'])
    expect(appTsconfig.compilerOptions.verbatimModuleSyntax).toBe(true)
    // strict/target options from the original scaffold are preserved
    expect(appTsconfig.compilerOptions.strict).toBe(true)

    const rootTsconfig = JSON.parse(await fs.readFile(join(base, 'tsconfig.json'), 'utf8'))
    expect(rootTsconfig.include).toBeUndefined()
  })

  test('skips tsconfig editing entirely for a plain JS project', async () => {
    const { folder, base } = freshFolder()
    useFixture(base, { mode: 'js', rootTsconfig: false })

    await expect(
      create({ folder, devBrowser: false, template: 'vanilla' }),
    ).resolves.toBeUndefined()

    expect(existsSync(join(base, 'tsconfig.json'))).toBe(false)
    expect(existsSync(join(base, 'tsconfig.app.json'))).toBe(false)
  })
})

// ---- folder collision guard --------------------------------------------

describe('existing folder guard', () => {
  test('exits without scaffolding when the target folder already exists', async () => {
    const { folder, base } = freshFolder()
    await fs.mkdir(base, { recursive: true })

    const exitSpy = mock((_code?: number) => {
      throw new Error('process.exit called')
    })
    const originalExit = process.exit
    // @ts-expect-error - narrowing process.exit for the spy
    process.exit = exitSpy
    const logSpy = mock(() => {})
    const originalLog = console.log
    console.log = logSpy

    let spawnedFixture = false
    currentFixture = async () => {
      spawnedFixture = true
    }

    try {
      await expect(create({ folder, devBrowser: false, template: 'vanilla' })).rejects.toThrow(
        'process.exit called',
      )
    } finally {
      process.exit = originalExit
      console.log = originalLog
    }

    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(logSpy).toHaveBeenCalledWith(`Folder ${folder} already existed`)
    expect(spawnedFixture).toBe(false)
  })
})
