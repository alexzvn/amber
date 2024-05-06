import { createServer } from 'http'
import { WebSocket, WebSocketServer } from 'ws'

export const connections = new Set<WebSocket>()

export const broadcast = (data: string) => {
  for (const ws of connections) {
    ws.send(data)
  }
}

export const server = createServer()
export const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket) => {
  connections.add(ws)

  ws.on('open', () => {
    ws.send('reload-extension')
  })

  ws.on('close', () => connections.delete(ws))
})