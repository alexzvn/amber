
const createConnect = () => {
  const socket = new WebSocket('ws://localhost:4321/events')

  socket.addEventListener('open', () => console.log('Dev server events connected'))

  socket.addEventListener('message', ({ data }) => {
    console.log(data)

    if (data.toString() === 'reload-extension') {
      chrome.runtime.reload()
    }
  })

  return socket
}

const connect = () => {
  const ws = createConnect()

  ws.addEventListener('error', (err: any) => {
    ws.close()
  })

  ws.addEventListener('close', (e) => {
    setTimeout(connect, 10_000)
  })
}


connect()
