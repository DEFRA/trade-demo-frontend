/**
 * Start page plugin
 * Registers the start page route
 */

import { startController } from './controller.js'

export const start = {
  plugin: {
    name: 'start',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/',
          ...startController,
          options: {
            ...startController.options,
            auth: {
              strategy: 'session',
              mode: 'try' // Accessible to all, populates user info if authenticated
            }
          }
        }
      ])
    }
  }
}
