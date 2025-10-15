/**
 * Examples plugin
 * Registers examples list route
 */

import { examplesController } from './controller.js'

export const examples = {
  plugin: {
    name: 'examples',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/examples',
          ...examplesController.list
        }
      ])
    }
  }
}
