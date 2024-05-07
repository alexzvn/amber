declare global {
  var __reload_event_url__: string
}

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
    console.log('Dev server events connected')
  })

  source.addEventListener('error', () => {
    source.readyState === source.CONNECTING && console.log('Reconnecting to dev server')
  })

}, 1)