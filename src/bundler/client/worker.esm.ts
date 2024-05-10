import LoadingPage from './loading.html?raw'

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

type CustomEvent = {
  type: 'custom'
  event?: 'amber:background.reload' | (string & {}),
  data?: unknown
}

type HMR = FullReloadEvent | UpdateEvent | CustomEvent

const extensionOrigin = new URL(chrome.runtime.getURL('/')).origin
const proxy = async (url: URL) => {
  url.protocol = 'http:'
  url.host = 'localhost'
  url.port = port + ''

  url.searchParams.set('t', Date.now().toString())
  const res = await fetch(url.href.replace(/=$|=(?=&)/g, '')).catch(() => undefined)

  if (url.pathname.endsWith('.html') && !res) {
    return new Response(LoadingPage, {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  if (!res) {
    const response = await fetch(chrome.runtime.getURL(url.pathname))

    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'text/javascript'
      }
    })
  }

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

const target = new EventTarget()
let shouldReload = false

target.addEventListener('connect', async () => {
  const reconnect = () => {
    setTimeout(() => target.dispatchEvent(new Event('connect')), 3000)
  }

  const ok = await fetch('http://localhost:' + port).catch(reconnect)

  if (!ok) {
    return
  }

  let socket: WebSocket|undefined = new WebSocket(`ws://localhost:${port}`, 'vite-hmr')

  socket.addEventListener('open', () => {
    console.log('[Amber] dev server connected')

    shouldReload && chrome.runtime.reload()

    const timer = setInterval(() => {
      socket ? socket.send('keepalive') : clearInterval(timer)
    }, 10 * 1000)

    // Trigger watch event for background file
    background && fetch(new URL(background, `http://localhost:${port}`))
  })

  socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data) as HMR

    if (data.type === 'custom' && data.event === 'amber:background.reload') {
      chrome.runtime.reload()
    }
  })

  socket.addEventListener('error', () => {
    console.log('[amber] Lost connection to dev server')
    socket?.close()
  })

  socket.addEventListener('close', () => {
    socket = undefined
    shouldReload = true
    target.dispatchEvent(new Event('connect'))
  })
})

target.dispatchEvent(new Event('connect'))
