import { createValueController } from './controller.js'

export const createValue = {
  plugin: {
    name: 'create-value',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/example/create/value',
          ...createValueController.get,
          options: { ...createValueController.get.options, auth: false }
        },
        {
          method: 'POST',
          path: '/example/create/value',
          ...createValueController.post,
          options: { ...createValueController.post.options, auth: false }
        }
      ])
    }
  }
}
