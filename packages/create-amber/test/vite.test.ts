import { describe, expect, test } from 'bun:test'
import { FRAMEWORKS } from '../src/vite'

// `command.ts` feeds `TEMPLATES`/`FRAMEWORKS` straight into `prompts` choice
// lists keyed by `.name`; a duplicate variant name would make two choices
// collapse into one and silently pick the wrong scaffold.
describe('vite framework/template catalogue', () => {
  test('every variant name is unique across all frameworks', () => {
    const seen = new Set<string>()

    for (const framework of FRAMEWORKS) {
      for (const variant of framework.variants) {
        expect(seen.has(variant.name)).toBe(false)
        seen.add(variant.name)
      }
    }
  })
})
