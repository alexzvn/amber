declare global {
  var __reload_event_url__: string
}

const log = (... args: any) => {
  const style = [
    'background-color: #e0005a',
    'color: #ffffff',
    'padding: 4px 6px',
    'border-radius: 3px',
    'font-weight: bold'
  ]

  console.log('%cAmber 🐰', style.join(';'), ...args)
}

log('Auto reload is omitted during build process')
setTimeout(() => {
  const source = new EventSource(__reload_event_url__)

  source.addEventListener('reload', (event) => {
    chrome.runtime.reload()
  })

  source.addEventListener('message', (event) => {
    if (event.data === 'reload-extension') {
      chrome.runtime.reload()
    }
  })

  source.addEventListener('open', () => {
    console.log('[Amber] Dev server events connected')
  })

  source.addEventListener('error', () => {
    source.readyState === source.CONNECTING && console.log('[Amber] Reconnecting to dev server')
  })

}, 1)