import { viewController } from './controller.js'

export const view = {
  plugin: {
    name: 'view',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/example/{id}',
          ...viewController
        }
      ])
    }
  }
}
