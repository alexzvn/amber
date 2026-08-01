# amber

Browser-extension toolchain for Chrome MV3. Packages live under `packages/*/src`:

- `@amber.js/core` (`packages/amber`) — runtime library
- `@amber.js/bundler` (`packages/bundler`) — build tooling
- `create-amber` (`packages/create-amber`) — project scaffolder

`docs/` is the published VitePress site.

## Agent skills

### Issue tracker

GitHub Issues on `alexzvn/amber`, driven by the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its role name. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: root `CONTEXT-MAP.md` indexes one `CONTEXT.md` + `docs/adr/` per package. See `docs/agents/domain.md`.
