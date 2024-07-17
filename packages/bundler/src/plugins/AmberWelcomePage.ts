import { defineVitePlugin } from '~/helper'
import welcome from '../cli/dev/welcome.html?raw'

export default defineVitePlugin(() => {

  return {
    name: 'amber:dev-server-welcome-page',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '/', `http://${req.headers.host}`)
  
        if (url.pathname === '/@amber.js/welcome') {
          res.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Length': Buffer.byteLength(welcome)
          })
  
          return res.end(welcome)
        }
  
        next()
      })
    }
  }
})