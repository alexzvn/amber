import { $ } from 'bun'

// @ts-ignore
process.env.FORCE_COLOR = 1;

['bundler', 'amber', 'create-amber'].map(async (name) => {
  await $`bun i && bun run build`.cwd(`packages/${name}`)
})