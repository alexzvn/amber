# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo is **multi-context**: a root `CONTEXT-MAP.md` points at one `CONTEXT.md` per package.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — the index of contexts. It tells you which context owns the area you're touching.
- **`packages/<name>/CONTEXT.md`** — the glossary for each context relevant to your topic. Read every one you'll be working in, not just the first.
- **`docs/adr/`** at the root — system-wide decisions, spanning two or more contexts.
- **`packages/<name>/docs/adr/`** — decisions scoped to a single context.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT-MAP.md
├── docs/adr/                              ← system-wide decisions
└── packages/
    ├── amber/                             ← Runtime context (@amber.js/core)
    │   ├── CONTEXT.md
    │   ├── docs/adr/
    │   └── src/
    ├── bundler/                           ← Build context (@amber.js/bundler)
    │   ├── CONTEXT.md
    │   ├── docs/adr/
    │   └── src/
    └── create-amber/                      ← Scaffold context (create-amber)
        ├── CONTEXT.md
        ├── docs/adr/
        └── src/
```

## Which context owns a term?

Terms are scoped to their context, and the same word may legitimately mean different things in two of them. When you name a concept, name the context with it if there's any ambiguity ("a Build-context entrypoint", not just "an entrypoint").

A term that needs to mean the same thing in every context belongs in `CONTEXT-MAP.md`, not in a package glossary. Duplicating a definition across two `CONTEXT.md` files is a smell — either promote it to the map or accept that the two contexts genuinely mean different things.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the owning context's `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding, and say which log it came from:

> _Contradicts `packages/bundler/docs/adr/0007-manifest-generation.md` — but worth reopening because…_

A change that contradicts a **root** ADR affects every context: raise it before implementing, don't resolve it inside one package.
