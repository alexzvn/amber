---
name: commit
description: Draft and create git commits with conventional, subject-only messages split into atomic units. Use when the user asks to commit, draft commits, or split working-tree changes into commits.
disable-model-invocation: true
---

# Commit

## Rules

- **Conventional subject**: `type(scope): summary`. Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `build`, `perf`. Scope = area (`server`, `ui`, `wp`).
- **Subject only. No body.** Omit the body entirely except in extreme cases (a non-obvious rationale that will otherwise be lost). Default is empty.
- **No trailing explanation** — no em-dash addendum, no "because…", no file lists appended to the subject.
- **Imperative, lowercase, no period**: `add`, `remove`, `fix` — not `added`/`Adds`/`.`.

## Atomic splitting

Split working-tree changes into the smallest coherent commits that each build:

- **Deps before the code that imports them** (e.g. `chore(ui): add dayjs` precedes the feature using it).
- **One concern per commit** — separate server vs ui, unrelated features, mechanical vs behavioral.
- **Order so each commit compiles/builds** on its own.
- A single-file rewrite is one commit — don't hunk-split into non-atomic pieces.

## Workflow

1. Inspect: `git status` + `git diff` (and `git diff --cached`).
2. Group changed files into atomic commits; decide order.
3. Draft the subject list (subjects only) and confirm with the user.
4. On approval, stage per group and commit:
   ```
   git add <files> && git commit -q -m "type(scope): summary"
   ```
5. Verify: `git log --oneline` + `git status --short` (clean tree).

## Example

```
feat(server): add BetterAuthMiddleware session guard
chore(ui): add dayjs and ua-parser-js
feat(ui): manage active sessions in dashboard settings
```
