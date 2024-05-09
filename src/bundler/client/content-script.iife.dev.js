
// Injected during build time
// declare const __PRE_SCRIPT__: string|undefined
// declare const __SCRIPT__: string

(async () => {
  const info = (... args) => {
    const style = [
      'background-color: #e0005a',
      'color: #ffffff',
      'padding: 4px 6px',
      'border-radius: 3px',
      'font-weight: bold'
    ]

    console.log('%cAmber 🐰', style.join(';'), ...args)
  }

  const pre = __PRE_SCRIPT__
  const script = __SCRIPT__

  try {
    typeof pre !== 'undefined' && await import(pre)
    await import(script)
  } catch {
    info('Content script may not work due because strict site CSP.')
    info('You may want to enable `amber.bypassCSP` to `true` in amber.config.ts')
  }
})()