import { $ } from 'bun'
import { spawn } from 'child_process'

const target = process.argv[2]
const argv = process.argv.slice(3)

const packages = ['amber', 'bundler', 'create-amber']

// @ts-ignore
process.env.FORCE_COLOR = 1

const publish = async (pkg: string) => {
  const location = `packages/${pkg}`

  try {
    await $`bun run build`.cwd(location)
  } catch (e) {
    return
  }

  await $`npm publish ${argv.join(' ')}`.cwd(location).catch(() => {})
}

setImmediate(async () => {
  if (! target || !['all', ...packages].includes(target)) {
   return console.log(
      'Usage: bun scripts/publish.ts <all|amber|bundler|create-amber> [--dry-run] [other-npm-flags]'
    );
  }

  if (target !== 'all') {
    return publish(target)
  }

  for (const pkg of packages) {
    await publish(pkg)
  }
})