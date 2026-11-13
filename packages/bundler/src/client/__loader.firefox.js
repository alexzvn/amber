// Firefox has no background service worker to proxy extension requests to Vite,
// so this page fetches its HTML from the dev server and loads every script from
// that origin (allowed by the dev-only `extension_pages` CSP).
const $ = document.querySelector.bind(document)

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

const absolute = (element, attribute, base) => {
  const value = element.getAttribute(attribute)

  value && element.setAttribute(attribute, new URL(value, base).href)
}

const fetchPage = async (origin) => {
  // the page's own URL on the dev server, so `./x.ts` resolves next to the HTML
  const url = new URL(location.pathname + location.search, origin)
  const response = await fetch(url)

  if (! response.ok) {
    throw new Error(`Dev server answered ${response.status} for ${location.pathname}`)
  }

  const page = new DOMParser().parseFromString(await response.text(), 'text/html')

  page.querySelectorAll('script[src], img[src]').forEach(element => absolute(element, 'src', url))
  page.querySelectorAll('link[href]').forEach(element => absolute(element, 'href', url))

  return page
}

const mount = async (page) => {
  for (const { name, value } of page.documentElement.attributes) {
    document.documentElement.setAttribute(name, value)
  }

  document.head.replaceWith(document.importNode(page.head, true))
  document.body.replaceWith(document.importNode(page.body, true))

  // Parsed scripts never run; recreate them in document order so each one does.
  for (const inert of document.querySelectorAll('script')) {
    const script = document.createElement('script')

    for (const { name, value } of inert.attributes) {
      script.setAttribute(name, value)
    }

    script.textContent = inert.textContent

    const loaded = script.src
      ? new Promise(ok => { script.onload = script.onerror = ok })
      : undefined

    inert.replaceWith(script)
    await loaded
  }
}

window.addEventListener('load', async () => {
  $('button').onclick = () => chrome.runtime.reload()

  const origin = new URL($('a').href).origin

  for (let attempt = 1; ; attempt++) {
    const page = await fetchPage(origin).catch(console.warn)

    if (page) {
      return mount(page)
    }

    const timeout = Math.min(100 * Math.pow(2, attempt), 5000)
    info(`Dev server is offline, retries in ${timeout}ms`)

    await new Promise(ok => setTimeout(ok, timeout))
  }
})
