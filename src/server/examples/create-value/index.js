import { createValueController } from './controller.js'

export const createValue = {
  plugin: {
    name: 'create-value',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/example/create/value',
          ...createValueController.get
        },
        {
          method: 'POST',
          path: '/example/create/value',
          ...createValueController.post
        }
      ])
    }
  }
}
