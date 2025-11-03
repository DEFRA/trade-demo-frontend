/**
 * Dashboard Plugin
 *
 * Registers the protected dashboard route - entry point to the trade imports journey.
 */

import { dashboardController } from './controller.js'

export const dashboard = {
  plugin: {
    name: 'dashboard',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/dashboard',
          ...dashboardController,
          options: {
            ...dashboardController.options,
            auth: {
              strategy: 'session-cookie',
              mode: 'required' // Must be authenticated to access
            },
            description: 'Trade imports dashboard',
            notes:
              'Protected route - entry point to imports journey. Requires valid session cookie.'
          }
        }
      ])
    }
  }
}
