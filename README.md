# Amber.js

A meta framework for building Chrome MV3 extensions. Declare your entrypoints
in `amber.config.ts` and Amber generates the manifest, bundles each context
correctly, and gives you hot reload that reaches the service worker.

**[Documentation](https://amber.alexzvn.me)**

## Quick start

```bash
npm create amber@latest my-extension
# or: yarn create amber / pnpm create amber / bun create amber
```

```bash
cd my-extension
npm install
npm run dev
```

Then load the `dist/` folder at `chrome://extensions` with developer mode on.
The full walkthrough is in [Get
Started](https://amber.alexzvn.me/guide/get-started).

## Packages

| Package | Description |
| --- | --- |
| [`@amber.js/core`](./packages/amber) | Runtime library — typed cross-context messaging, storage, DOM helpers. |
| [`@amber.js/bundler`](./packages/bundler) | Vite-based toolchain and the `amber` CLI. |
| [`create-amber`](./packages/create-amber) | Project scaffolder. |

## Documentation

- [How Amber maps to MV3](https://amber.alexzvn.me/guide/mv3)
- [`amber.config.ts`](https://amber.alexzvn.me/guide/building/config)
- [Runtime API](https://amber.alexzvn.me/guide/api/messaging)
- [Shipping](https://amber.alexzvn.me/guide/shipping/build)

## License

MIT
