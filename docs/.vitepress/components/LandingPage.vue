<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { codeToHtml } from 'shiki'

const source = `import { defineConfig, BackgroundScript,
  ContentScript, Page } from '@amber.js/bundler'

export default defineConfig({
  manifest: {
    name: 'my-extension',
    background: new BackgroundScript(
      'src/background.ts'
    ),
    action: { default_popup: new Page('index.html') }
  }
})`

const highlighted = ref('')

onMounted(async () => {
  highlighted.value = await codeToHtml(source, {
    lang: 'ts',
    theme: 'vitesse-dark'
  })
})
</script>

<template>
  <main class="landing-page overflow-hidden bg-canvas font-sans text-paper">
    <nav class="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10" aria-label="Primary navigation">
      <a href="/" class="group flex items-center gap-3 font-semibold tracking-tight text-white" aria-label="Amber.js home">
        <span class="grid size-8 place-items-center rounded-md bg-primary font-mono text-sm font-bold text-ink transition-transform group-hover:-rotate-6">A</span>
        <span>amber<span class="text-accent">.js</span></span>
      </a>
      <div class="hidden items-center gap-7 text-sm text-muted md:flex">
        <a class="transition-colors hover:text-white" href="/guide/get-started">Docs</a>
        <a class="transition-colors hover:text-white" href="/guide/mv3">How it works</a>
        <a class="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 font-mono text-xs text-white transition-colors hover:border-accent hover:text-accent" href="https://github.com/alexzvn/amber">
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </div>
    </nav>

    <section class="hero-grid relative min-h-screen border-y border-white/10">
      <div class="mx-auto grid max-w-7xl gap-14 px-6 py-20 lg:grid-cols-[1fr_1.04fr] lg:items-center lg:px-10 lg:py-28">
        <div class="relative z-10 max-w-2xl">
          <p class="mb-7 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-success"><span class="h-px w-8 bg-success"></span> Chrome extension toolchain</p>
          <h1 class="text-5xl font-semibold tracking-[-0.065em] text-white sm:text-6xl lg:text-7xl">Write the extension.<br><span class="text-accent">Skip the wiring.</span></h1>
          <p class="mt-7 max-w-xl text-lg leading-8 text-muted">Amber is the MV3 framework that turns declared entrypoints into a working extension—manifest, dev server, and context-aware runtime included.</p>
          <div class="mt-10 flex flex-wrap gap-3">
            <a href="/guide/get-started" class="rounded-full bg-primary px-6 py-3 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5 hover:bg-primary-hover">Get started <span aria-hidden="true">→</span></a>
            <a href="/guide/mv3" class="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/5">See how it maps to MV3</a>
          </div>
          <p class="mt-8 font-mono text-xs text-faint"><span class="mr-2 text-success">$</span>npm create amber@latest</p>
        </div>

        <div class="relative mx-auto w-full max-w-xl lg:ml-auto">
          <div class="absolute -right-10 -top-10 size-52 rounded-full bg-success/10 blur-3xl"></div>
          <div class="relative overflow-hidden rounded-xl border border-white/15 bg-surface shadow-2xl shadow-black/30">
            <div class="flex items-center justify-between border-b border-white/10 px-5 py-3 font-mono text-[11px] text-faint">
              <span>amber.config.ts</span><span class="rounded-full bg-success/10 px-2 py-1 text-success">source</span>
            </div>
            <div v-if="highlighted" class="code-frame" v-html="highlighted"></div>
            <pre v-else class="overflow-x-auto p-5 text-[12px] leading-6 font-mono">{{ source }}</pre>
            <div class="border-t border-dashed border-white/15 px-5 py-4">
              <div class="mb-3 flex items-center gap-3 font-mono text-[11px] text-faint"><span class="h-px flex-1 bg-white/10"></span>build output<span class="h-px flex-1 bg-white/10"></span></div>
              <div class="rounded-md bg-canvas p-3 font-mono text-[11px] leading-5 text-muted">
                <span class="text-faint">dist/</span><br><span class="text-faint">├─</span> entries/background.js <span class="float-right text-success">generated</span><br><span class="text-faint">├─</span> index.html<br><span class="text-faint">└─</span> manifest.json
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-paper px-6 py-20 text-ink lg:px-10 lg:py-28">
      <div class="mx-auto max-w-7xl">
        <div class="max-w-2xl">
          <p class="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-accent-deep">Less MV3 ceremony</p>
          <h2 class="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">The browser extension work you meant to do.</h2>
          <p class="mt-5 text-lg leading-8 text-ink-muted">Amber owns the wiring that repeats in every MV3 project, so your configuration describes the extension instead of its build output.</p>
        </div>
        <div class="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
          <article class="bg-paper-raised p-7 lg:p-8">
            <p class="font-mono text-xs text-accent-deep">01 / MANIFEST</p>
            <h3 class="mt-10 text-2xl font-semibold tracking-[-0.04em]">Derived, not maintained.</h3>
            <p class="mt-4 leading-7 text-ink-muted">Declare pages, workers, content scripts, and icons as objects. Amber resolves paths and writes <code class="rounded bg-line-soft px-1.5 py-0.5 font-mono text-[13px]">manifest.json</code>.</p>
          </article>
          <article class="bg-paper-raised p-7 lg:p-8">
            <p class="font-mono text-xs text-accent-deep">02 / DEVELOPMENT</p>
            <h3 class="mt-10 text-2xl font-semibold tracking-[-0.04em]">HMR reaches MV3.</h3>
            <p class="mt-4 leading-7 text-ink-muted">Pages update through Vite. Content scripts are rebuilt and re-injected. Workers are rebuilt and restarted—without a manual extension reload.</p>
          </article>
          <article class="bg-paper-raised p-7 lg:p-8">
            <p class="font-mono text-xs text-accent-deep">03 / RUNTIME</p>
            <h3 class="mt-10 text-2xl font-semibold tracking-[-0.04em]">Messages carry their type.</h3>
            <p class="mt-4 leading-7 text-ink-muted">Call a background handler from a content script and receive its actual return type. Handler signatures propagate across contexts.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="bg-ink px-6 py-20 lg:px-10 lg:py-28">
      <div class="mx-auto max-w-7xl">
        <div class="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div class="max-w-2xl">
            <p class="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-success">Three contexts, one extension</p>
            <h2 class="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">Keep the boundaries.<br>Lose the blind spots.</h2>
          </div>
          <a href="/guide/mv3" class="text-sm font-semibold text-accent hover:text-accent-hover">How Amber maps to MV3 <span aria-hidden="true">→</span></a>
        </div>
        <div class="mt-14 grid gap-4 lg:grid-cols-3">
          <article class="rounded-xl border border-white/10 bg-surface-raised p-6">
            <div class="flex items-center justify-between">
              <span class="grid size-10 place-items-center rounded-lg bg-success font-mono text-lg text-ink">↻</span>
              <span class="font-mono text-[10px] uppercase tracking-wider text-faint">service worker</span>
            </div>
            <h3 class="mt-12 text-2xl font-semibold text-white">Background</h3>
            <p class="mt-3 leading-7 text-muted">Browser-owned, DOM-free, and restarted when idle. Amber rebuilds and restarts it on change.</p>
          </article>
          <article class="rounded-xl border border-white/10 bg-surface-raised p-6">
            <div class="flex items-center justify-between">
              <span class="grid size-10 place-items-center rounded-lg bg-accent font-mono text-lg text-ink">&lt;/&gt;</span>
              <span class="font-mono text-[10px] uppercase tracking-wider text-faint">web page</span>
            </div>
            <h3 class="mt-12 text-2xl font-semibold text-white">Content script</h3>
            <p class="mt-3 leading-7 text-muted">Works against a page’s DOM in an isolated JavaScript world. Amber re-injects it into matching tabs.</p>
          </article>
          <article class="rounded-xl border border-white/10 bg-surface-raised p-6">
            <div class="flex items-center justify-between">
              <span class="grid size-10 place-items-center rounded-lg bg-info font-mono text-lg text-ink">□</span>
              <span class="font-mono text-[10px] uppercase tracking-wider text-faint">extension origin</span>
            </div>
            <h3 class="mt-12 text-2xl font-semibold text-white">Page</h3>
            <p class="mt-3 leading-7 text-muted">Popups, options, and extension pages run on their own Chrome extension origin with standard Vite HMR.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="bg-paper px-6 py-20 text-ink lg:px-10 lg:py-28">
      <div class="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
        <div>
          <p class="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-accent-deep">Local development</p>
          <h2 class="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Start coding. Amber handles the loading ritual.</h2>
          <p class="mt-5 leading-8 text-ink-muted">Run the dev server to build an unpacked extension in <code class="rounded bg-line-soft px-1.5 py-0.5 font-mono text-sm">dist/</code>. Or open an isolated Chromium profile with the extension already loaded.</p>
          <a class="mt-8 inline-block text-sm font-semibold text-accent-deep hover:text-accent-deep-hover" href="/guide/building/dev-server">Dev server details <span aria-hidden="true">→</span></a>
        </div>
        <div class="overflow-hidden rounded-xl bg-surface shadow-xl">
          <div class="flex items-center gap-2 border-b border-white/10 px-5 py-3">
            <span class="size-2.5 rounded-full bg-dot-red"></span>
            <span class="size-2.5 rounded-full bg-dot-yellow"></span>
            <span class="size-2.5 rounded-full bg-dot-green"></span>
            <span class="ml-3 font-mono text-[11px] text-faint">my-extension — zsh</span>
          </div>
          <div class="p-6 font-mono text-sm leading-7 text-muted">
            <p><span class="text-success">$</span> amber dev --dev-browser</p>
            <p class="mt-4 text-faint">Amber v0.5.2 ready in 382 ms</p>
            <p><span class="text-accent">➜</span> extension written to dist/</p>
            <p><span class="text-accent">➜</span> Chromium started with extension preloaded</p>
            <p class="mt-4 text-faint">press <span class="rounded border border-white/15 px-1.5 py-0.5 text-muted">e</span> to reload extension · <span class="rounded border border-white/15 px-1.5 py-0.5 text-muted">p</span> to reload active tab</p>
          </div>
        </div>
      </div>
    </section>

    <section class="relative bg-primary px-6 py-24 text-ink lg:px-10 lg:py-32">
      <div class="mx-auto max-w-7xl">
        <p class="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary-deep">Ready to make an extension?</p>
        <div class="mt-5 flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
          <h2 class="max-w-3xl text-5xl font-semibold tracking-[-0.06em] sm:text-6xl">Your first build should be about the product.</h2>
          <a href="/guide/get-started" class="w-fit rounded-full bg-ink px-6 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5">Create an Amber project <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>

    <footer class="border-t border-white/10 px-6 py-8 text-sm text-faint lg:px-10">
      <div class="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row">
        <p>Amber.js · A toolchain for Chrome extension MV3.</p>
        <div class="flex gap-5"><a class="hover:text-white" href="/guide/get-started">Documentation</a><a class="hover:text-white" href="https://github.com/alexzvn/amber">GitHub</a></div>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.landing-page {
  min-height: 100vh;
}

.hero-grid {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 40px 40px;
}

.code-frame :deep(pre.shiki) {
  margin: 0;
  padding: 1.25rem;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5rem;
  background-color: transparent !important;
}
</style>
