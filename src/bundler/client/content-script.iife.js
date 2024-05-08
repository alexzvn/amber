
// Injected during build time
// declare const __PRE_SCRIPT__: string|undefined
// declare const __SCRIPT__: string

(async () => {
  const pre = __PRE_SCRIPT__
  const script = __SCRIPT__
  
  if (typeof pre !== 'undefined') {
    await import(pre)
  }

  await import(script)
})().catch(console.error)