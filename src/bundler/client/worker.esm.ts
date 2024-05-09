// injected during build process
declare const __HMR_PORT__: string

const extensionOrigin = new URL(chrome.runtime.getURL('/')).origin
const proxy = async (url: URL) => {
  url.protocol = 'http:'
  url.host = 'localhost'
  url.port = __HMR_PORT__

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