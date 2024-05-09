// injected during build process
declare const __HMR_PORT__: number
declare const __SCRIPT__: string|undefined

const port = __HMR_PORT__
const background = __SCRIPT__ // current background script

type FullReloadEvent = {
  type: 'full-reload'
  /** Absolute filepath */
  triggeredBy: string
}

type UpdateEvent = {
  type: 'update'
  updates: Array<{
    acceptPath: string
    explicitImportRequired: boolean
    isWithinCircularImport: boolean
    path: string
    ssrInvalidates: unknown[]
    timestamp: number
    type: string
  }>
}

type HMR = FullReloadEvent | UpdateEvent

const extensionOrigin = new URL(chrome.runtime.getURL('/')).origin
const proxy = async (url: URL) => {
  url.protocol = 'http:'
  url.host = 'localhost'
  url.port = port + ''

  url.searchParams.set('t', Date.now().toString())
  const res = await fetch(url.href.replace(/=$|=(?=&)/g, ''))

  return new Response(res.body, {
    headers: {
    'Content-Type': res.headers.get('Content-Type') ?? 'text/javascript'
    }
  })
}

self.addEventListener('fetch', (event: any) => {
  const url= new URL(event.request.url)

  if (url.origin === extensionOrigin) {
    event.respondWith(proxy(url))
  }
})

let socket = new WebSocket(`ws://localhost:${port}`, 'vite-hmr')

socket.addEventListener('open', () => {
  console.log('[Amber] dev server connected')

  const timer = setInterval(() => {
    socket ? socket.send('keepalive') : clearInterval(timer)
  }, 10 * 1000)

  // Trigger watch event for background file
  background && fetch(new URL(background, `http://localhost:${port}`))
})

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data) as HMR

  if (data.type !== 'full-reload') {
    return
  }

  if (background && data.triggeredBy.endsWith(background)) {
    chrome.runtime.reload()
  }
})