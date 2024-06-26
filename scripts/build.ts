import { $ } from 'bun'

['bundler', 'amber'].map(async (name) => {
  await $`bun run build`.cwd(`packages/${name}`)
})