import type { ViteDevServer } from 'vite'
import { defineVitePlugin } from '../helper'


export default defineVitePlugin(() => {
  let server: ViteDevServer

  return {
    name: 'amber:auto-restart-dev-server',

    configureServer(_server) {
      server = _server
    },

    watchChange(id) {
      const file = id.split('/').pop()

      if (file?.startsWith('amber.config')) {
        server.config.logger.info(file + ' changed, restarting server...', { timestamp: true })

        server.restart(true)
      }
    },
  }
})