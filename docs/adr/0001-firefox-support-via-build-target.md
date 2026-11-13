# Firefox support via a build target

Amber emitted Chrome MV3 only. We add a `--browser firefox` option to `amber build` and `amber dev` that rewrites the emitted manifest for Firefox MV3 (`background.scripts` instead of `service_worker`, no `use_dynamic_url`, `side_panel` mapped to `sidebar_action`), while `chrome` stays the default so existing output is untouched.

Status: accepted

## Considered options

- **Dual-key background in every build** (`service_worker` and `scripts` together, as MDN suggests) — rejected: it changes the Chrome manifest for every existing user, and Chrome warns on `background.scripts` in MV3.
- **MV2 output for Firefox** — rejected; see `docs/research/mv2-firefox-support.md`.
- **webextension-polyfill** — unnecessary: Firefox MV3 (106+) returns promises from `chrome.*`, so `@amber.js/core` runs unchanged.

## Consequences

- Chrome output is byte-identical to before; `chrome` is the default target.
- Firefox dev cannot reuse the Chrome HMR path: it relies on a service-worker `fetch` proxy that Firefox event pages lack, and Firefox content scripts may only `import()` modules from the extension. So `amber dev --browser firefox` loads pages straight from the dev server (allowed by a dev-only `extension_pages` CSP) and builds content scripts to `dist/`, reloading the tab or extension on change instead of hot-swapping.
- One `outDir`: a Firefox build overwrites a Chrome build, so build and archive one browser at a time.
