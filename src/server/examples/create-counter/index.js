import { createCounterController } from './controller.js'

export const createCounter = {
  plugin: {
    name: 'create-counter',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/example/create/counter',
          ...createCounterController.get,
          options: { ...createCounterController.get.options, auth: false }
        },
        {
          method: 'POST',
          path: '/example/create/counter',
          ...createCounterController.post,
          options: { ...createCounterController.post.options, auth: false }
        }
      ])
    }
  }
}
