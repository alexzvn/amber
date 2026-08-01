# Context Map

Amber is split into four bounded contexts — three packages plus the documentation site. Each
owns its own glossary (`CONTEXT.md`) and its own decision log (`docs/adr/`). System-wide
decisions — anything spanning two or more contexts — live in the root `docs/adr/`.

Read the context(s) relevant to your topic before exploring. See `docs/agents/domain.md`
for the consumer rules.

| Context           | Package             | Glossary                           | Decisions                         |
| ----------------- | ------------------- | ---------------------------------- | --------------------------------- |
| **Runtime**       | `@amber.js/core`    | `packages/amber/CONTEXT.md`        | `packages/amber/docs/adr/`        |
| **Build**         | `@amber.js/bundler` | `packages/bundler/CONTEXT.md`      | `packages/bundler/docs/adr/`      |
| **Scaffold**      | `create-amber`      | `packages/create-amber/CONTEXT.md` | `packages/create-amber/docs/adr/` |
| **Documentation** | —                   | `docs/CONTEXT.md`                  | `docs/adr/` (system-wide)         |
| _system-wide_     | —                   | this file                          | `docs/adr/`                       |

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

## Documentation — `docs`

The published VitePress site and the agent-facing docs under `docs/agents/`. Speaks in terms
of home/guide pages, nav and sidebar config, markdown extensions, and the repo's own
documentation conventions — context map, glossaries, decision logs, issue tracker, triage
labels. Unlike the other three it ships no code: it is a meta-context that owns the
documentation conventions the other contexts consume, and describes them without being
depended on by them.

## Relationships

```
Scaffold ──emits projects that use──▶ Build ──produces bundles containing──▶ Runtime

Documentation ──describes, and sets the doc conventions for──▶ Scaffold, Build, Runtime
```

Scaffold is downstream of both: template changes must follow Build's config shape and
Runtime's public API, never the reverse.

Each context's `CONTEXT.md` is a glossary and nothing else — no implementation detail, no
spec. Add a term when it is genuinely resolved, not upfront.
