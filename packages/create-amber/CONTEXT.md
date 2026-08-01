# Scaffold

The `create-amber` initialiser: a one-shot CLI that creates a new Amber extension project by generating a Vite project, layering Amber templates and configuration onto it, and wiring its package manifest. It produces new projects and is never executed at application runtime or during builds.

## Language

**Project name**:
The name the user supplies via the `[folder]` argument or the `Project name:` text prompt; it becomes the target folder the initialiser creates and modifies.
_Avoid_: folder, target directory

**Vite scaffold**:
The base project produced by delegating to `npm create vite@latest <folder>`; every later step — templates, configuration, manifest, tsconfig — edits that generated project in place.
_Avoid_: create-vite

**Template**:
A `.template` source file shipped in `src/template/` (`background.ts.template`, `content-script.ts.template`, `config.ts.template`) whose raw contents are written verbatim into the scaffolded project.

**Placeholder**:
A `__CONTENT_SCRIPT__`, `__BACKGROUND_SCRIPT__`, or `__VITE__` token inside the config template, substituted with real paths or code by string replacement when the scaffold runs.

**Prompt**:
An interactive question asked by the `prompts` library before scaffolding — a text prompt for the project name and a confirm prompt for the dev browser choice.

**Dev browser**:
The `devBrowser` choice to develop against an isolated Chromium; when accepted, the scaffold adds `playwright` as a devDependency and a `dev:browser` script running `amber dev --dev-browser`.
_Avoid_: isolated chromium

**Mode**:
Whether the generated project is TypeScript (`ts`) or JavaScript (`js`), detected by the presence of a `tsconfig.json`; it decides the file extensions the scaffold writes (`amber.config.ts` vs `.js`, `src/content-script.ts` vs `.js`).

**Vite config folding**:
Merging the generated project's existing `vite.config` into `amber.config` as a `vite:` property and deleting the standalone config file, so the extension's config keeps the project's Vite settings.

**Package transform**:
Rewriting the generated `package.json` to add the Amber dependencies (`@amber.js/core`, `@amber.js/bundler`, `@types/chrome`) and the `dev`, `build`, `archive`, and `clean` scripts.

**CreateAmber**:
The configuration object (`folder`, `devBrowser`) that carries the user's choices from the CLI into the `create` step.
