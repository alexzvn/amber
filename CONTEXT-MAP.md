# Context Map

Amber is split into three bounded contexts, one per package. Each owns its own glossary
(`CONTEXT.md`) and its own decision log (`docs/adr/`). System-wide decisions — anything
spanning two or more contexts — live in the root `docs/adr/`.

Read the context(s) relevant to your topic before exploring. See `docs/agents/domain.md`
for the consumer rules.

| Context      | Package             | Glossary                          | Decisions                         |
| ------------ | ------------------- | --------------------------------- | --------------------------------- |
| **Runtime**  | `@amber.js/core`    | `packages/amber/CONTEXT.md`        | `packages/amber/docs/adr/`        |
| **Build**    | `@amber.js/bundler` | `packages/bundler/CONTEXT.md`      | `packages/bundler/docs/adr/`      |
| **Scaffold** | `create-amber`      | `packages/create-amber/CONTEXT.md` | `packages/create-amber/docs/adr/` |
| _system-wide_ | —                  | this file                          | `docs/adr/`                       |

## Runtime — `packages/amber`

The library extension authors import at runtime. Speaks in terms of cross-surface
messaging (channels, message handlers), storage wrappers, DOM selectors, hashing, and
queues. Knows nothing about how the extension was built or scaffolded.

## Build — `packages/bundler`

The Vite-based toolchain and `amber` CLI. Speaks in terms of manifest generation,
entrypoints, plugins, HMR injection, dev/build/archive commands. Owns the mapping from
source layout to a loadable MV3 extension.

## Scaffold — `packages/create-amber`

The `create-amber` initialiser. Speaks in terms of templates and prompts. A one-shot
producer of new projects; it depends on the other two contexts' conventions but is not
depended on by them.

## Relationships

```
Scaffold ──emits projects that use──▶ Build ──produces bundles containing──▶ Runtime
```

Scaffold is downstream of both: template changes must follow Build's config shape and
Runtime's public API, never the reverse.

A context's `CONTEXT.md` is created lazily, the first time `/domain-modeling` resolves a
term there. Absence is not a gap to fill upfront.
