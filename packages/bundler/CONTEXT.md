# Build

The Vite-based toolchain and `amber` CLI (`@amber.js/bundler`). It takes an extension's manifest and source layout and produces a loadable MV3 extension — generating `manifest.json`, bundling entrypoints, and wiring the dev loop (HMR, dev browser, sessions).

## Language

### Configuration

**Manifest**:
The MV3 Chrome extension manifest object (`GeneralManifest`) that describes the extension to the browser. The central artifact of this context: the bundler merges the author's manifest with what the registered entrypoints imply and writes the result as `manifest.json`.
_Avoid_: Chrome manifest (the superset type), package manifest

**Amber config**:
The `amber.config.ts` (or `.js`) file at the project root that the CLI loads on every command (`loadAmberConfig`). Its default export is the `DefinedConfig` produced by `defineConfig`: a `{ vite, manifest, devManifest, amber }` object.
_Avoid_: vite.config — the Vite config is a nested field of the amber config, not the file itself

**devManifest**:
A partial manifest merged over the base manifest only when running `dev` (via `defu`), so development-only declarations — dev hosts, ports, injected pages — never leak into the shipped extension.

**bypassCSP**:
An `amber` option (`boolean` or a match pattern or list of patterns) controlling whether the dev background worker may reach the dev server on pages with a strict Content Security Policy. When set, the toolchain adds the `declarativeNetRequest` permission and injects the `worker-bypass-csp.esm` client into the worker.

### Entrypoints

**ContentScript**:
A component that is both a registered entrypoint and a manifest `content_scripts` entry: it declares which `matches` pages it runs on, its bundle `format` (`es` or `iife`), and dev behaviors such as `hotReload` and `cssCodeSplit`. It serializes into the manifest and into the Rollup input maps; `iife`-format scripts are built in a separate pass.
_Avoid_: content script (the generic browser concept — here it is the registered entrypoint class)

**BackgroundScript**:
A component describing the extension's service worker entrypoint. It serializes to the manifest's `background` field (`service_worker: entries/<name>.js`, `type: module`); its `autoReload` option opts the worker into dev HMR full reloads.
_Avoid_: service worker (the browser concept it wraps)

**Page**:
A component describing an HTML page entrypoint (options page, action popup, side panel). It is a `String` subclass whose value is the page path, with an optional `target` that remaps where the built HTML is written; registered pages become Rollup inputs.

**Icons**:
A component registering a source image to be produced as the extension's icon set — resized by `IconProcessor` (sharp) to the configured `size` list (default 16/32/48/128) under the icon `dir` (default `assets/`) — and serialized into the manifest's `icons` field.

### Plugins

**AmberPlugin**:
The plugin factory that assembles the amber Vite plugin suite for a given manifest and amber options: ResolveAlias, InjectWorkerHMR, ContentModulePolyfill, ManifestWriter, InlineScriptPolyfill, ImportViaURL, EmitTypeEnvironment, AutoRestart, AmberWelcomePage, IconProcessor. It is the single `plugins` entry applied to every dev and build config.

**ManifestWriter**:
The plugin (`amber:manifest-writer`) that owns `manifest.json` — it writes the merged manifest on build start and bundle end, injects the background worker and web-accessible resources when absent, and, in dev, grants the dev server host permission and serves all extension resources.

**InjectWorkerHMR**:
The plugin (`amber:inject-hmr-worker`) that wires the background worker into the dev loop: it prepends the `worker.esm` HMR client to worker modules (plus `worker-bypass-csp.esm` when `bypassCSP` is set), stamps the dev port into the client, writes the `entries/__loader.js` reload page, and triggers worker reloads when worker dependencies change.

**ContentModulePolyfill**:
The plugin (`amber:content-module-polyfill`) that makes ES-module content scripts and pages loadable under MV3: in dev it writes an IIFE loader per content script (fetching the module and `@vite/client` from the dev server) and a loading page per `Page`; in build it routes content-script entries into `scripts/`.

**InlineScriptPolyfill**:
The plugin (`amber:inline-script-polyfill`) that removes inline `<script>` tags from built HTML — forbidden under MV3's content security policy — by hashing each inline script and re-emitting it as a `shared/inline-<hash>.js` file referenced via `src`, served from memory by the dev server.

### Commands

**dev**:
The CLI command that starts the Vite dev server for the extension: it resolves the config with `devManifest` merged, runs a warm-up build, serves the welcome page, and — with `--dev-browser` — launches a persistent Chromium profile loaded with the built extension from `dist/`. Restarts happen through a self-respawn loop driven by a dev `Session` (exit code `0xfa`).

**build**:
The CLI command that produces the distributable extension in the build `outDir` (default `dist/`): two Vite passes — one bundling the module entrypoints (`entries/` entries, `shared/` chunks, `assets/` assets) and one IIFE pass for `iife`-format content scripts. Flags: `--prod`, `--minify`, `--sourcemap`, `--watch`, `--clean`.

**archive**:
The CLI command that zips the built `dist/` folder (adm-zip) into the `release/` folder as `[name]-[version].zip`, with a `--level` compression option and an `--outDir` override.
