import { describe, test, expect, afterAll } from 'bun:test'
import fs from 'fs/promises'
import os from 'os'
import { join } from 'path'
import AdmZip from 'adm-zip'

// NOTE: `packages/bundler/src/cli/program.ts` captures `export const cwd =
// process.cwd()` as a module-level constant at import time, and that module
// (and the shared `program` Command singleton) is cached across this entire
// `bun test` run. `clean.ts` relies on that captured `cwd`, so we must
// `process.chdir()` into its fixture directory *before* the very first
// import of `clean.ts`/`program.ts` in the whole suite. This file is the
// only one that imports the CLI, so import order is safe as long as this
// file performs its chdir+import before registering any test bodies.
const originalCwd = process.cwd()
const cleanFixtureDir = await fs.mkdtemp(join(os.tmpdir(), 'amber-clean-'))
process.chdir(cleanFixtureDir)

// Dynamic imports (not static) are required here: `clean.ts` reads
// `process.cwd()` at module-evaluation time into an exported `cwd`
// constant, so the chdir() above must happen strictly before this module
// graph is first evaluated. A static top-level `import` would be hoisted
// and evaluated before the chdir runs, defeating the fixture.
const { program } = await import('../src/cli/program')
await import('../src/cli/clean')
await import('../src/cli/archive')

process.chdir(originalCwd)

afterAll(async () => {
  process.chdir(originalCwd)
  await fs.rm(cleanFixtureDir, { recursive: true, force: true })
})

const run = (argv: string[]) => program.parseAsync(argv, { from: 'user' })

describe('amber clean', () => {
  test('clean removes dist/ but leaves .amber/ in place', async () => {
    await fs.writeFile(join(cleanFixtureDir, 'amber.config.ts'), 'export default {}')
    await fs.mkdir(join(cleanFixtureDir, 'dist'), { recursive: true })
    await fs.writeFile(join(cleanFixtureDir, 'dist', 'manifest.json'), '{}')
    await fs.mkdir(join(cleanFixtureDir, '.amber'), { recursive: true })
    await fs.writeFile(join(cleanFixtureDir, '.amber', 'cache.json'), '{}')

    await run(['clean'])

    await expect(fs.access(join(cleanFixtureDir, 'dist'))).rejects.toThrow()
    await expect(fs.access(join(cleanFixtureDir, '.amber'))).resolves.toBeNull()

    await fs.rm(join(cleanFixtureDir, '.amber'), { recursive: true, force: true })
  })

  test('cleanup removes both dist/ and .amber/', async () => {
    await fs.mkdir(join(cleanFixtureDir, 'dist'), { recursive: true })
    await fs.mkdir(join(cleanFixtureDir, '.amber'), { recursive: true })

    await run(['cleanup'])

    await expect(fs.access(join(cleanFixtureDir, 'dist'))).rejects.toThrow()
    await expect(fs.access(join(cleanFixtureDir, '.amber'))).rejects.toThrow()
  })

  test('exits with an error when no amber.config.(ts|js) is present', async () => {
    // `clean.ts` resolves its target directory from the `cwd` constant
    // captured once at import time (see the note above `cleanFixtureDir`),
    // so this case must reuse that same fixture dir rather than chdir
    // somewhere else — chdir has no effect on clean.ts's notion of cwd.
    await fs.rm(join(cleanFixtureDir, 'amber.config.ts'), { force: true })
    await fs.rm(join(cleanFixtureDir, 'amber.config.js'), { force: true })

    const originalExit = process.exit
    const originalError = console.error
    const exitCodes: Array<number | undefined> = []
    let errored = ''

    // @ts-expect-error intercepting process.exit for a CLI smoke test
    process.exit = (code?: number) => { exitCodes.push(code); throw new Error('__exit__') }
    console.error = (msg: string) => { errored = msg }

    try {
      await run(['clean'])
    } catch (e) {
      expect((e as Error).message).toBe('__exit__')
    } finally {
      process.exit = originalExit
      console.error = originalError
    }

    expect(exitCodes).toEqual([1])
    expect(errored).toBe('Amber config not found')

    await fs.writeFile(join(cleanFixtureDir, 'amber.config.ts'), 'export default {}')
  })
})

describe('amber archive', () => {
  let archiveDir: string

  afterAll(async () => {
    if (archiveDir) await fs.rm(archiveDir, { recursive: true, force: true })
  })

  test('zips the dist/ folder into release/<name>-<version>.zip by default', async () => {
    archiveDir = await fs.mkdtemp(join(os.tmpdir(), 'amber-archive-'))
    process.chdir(archiveDir)

    await fs.writeFile(join(archiveDir, 'package.json'), JSON.stringify({ name: 'my-ext', version: '2.1.0' }))
    await fs.mkdir(join(archiveDir, 'dist'), { recursive: true })
    await fs.writeFile(join(archiveDir, 'dist', 'manifest.json'), JSON.stringify({ name: 'my-ext' }))
    await fs.mkdir(join(archiveDir, 'dist', 'entries'), { recursive: true })
    await fs.writeFile(join(archiveDir, 'dist', 'entries', 'bg.js'), 'console.log(1)')

    try {
      await run(['archive'])

      const zip = new AdmZip(join(archiveDir, 'release', 'my-ext-2.1.0.zip'))
      const names = zip.getEntries().map(e => e.entryName).sort()
      expect(names).toContain('manifest.json')
      expect(names).toContain('entries/bg.js')
    } finally {
      process.chdir(originalCwd)
    }
  })

  test('honours a custom name template and --outDir', async () => {
    const dir = await fs.mkdtemp(join(os.tmpdir(), 'amber-archive-'))
    process.chdir(dir)

    try {
      await fs.writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'widget', version: '0.0.1' }))
      await fs.mkdir(join(dir, 'dist'), { recursive: true })
      await fs.writeFile(join(dir, 'dist', 'manifest.json'), '{}')

      await run(['archive', 'build-[name].[format]', '--outDir', 'builds'])

      const zip = new AdmZip(join(dir, 'builds', 'build-widget.zip'))
      expect(zip.getEntries().map(e => e.entryName)).toEqual(['manifest.json'])
    } finally {
      process.chdir(originalCwd)
      await fs.rm(dir, { recursive: true, force: true })
    }
  })
})
