import { createServer } from 'http'

type DevServer = ReturnType<typeof createServer> & {
  port?: number
}

const target = new EventTarget()
let id = 0

export const server = createServer((req, res) => {
  res.writeHead(200, {
    'X-Accel-Buffering': 'no',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })

  res.write('data: hello\n\n')

  target.addEventListener('broadcast', () => {
    const data = [
      'event: reload',
      'data: ' + Date.now(),
      'id: ' + id++
    ]

    res.write(data.join('\n') + '\n\n')
  })
}) as DevServer

export const broadcast = () => target.dispatchEvent(new Event('broadcast'))