const $ = document.querySelector.bind(document)
$('button').onclick = () => chrome.runtime.reload()

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

window.addEventListener('load', async () => {
  const url = $('a').href

  let attempt = 1

  do {
    await fetch(url).then(window.location.reload).catch(() => {})

    const timeout = Math.min(100 * Math.pow(2, attempt), 5000)
    info(`Dev server is offline, retries in ${timeout}ms`)

    await new Promise(ok => setTimeout(ok, timeout))
  } while (attempt++)
})