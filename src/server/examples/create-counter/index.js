import { createCounterController } from './controller.js'

export const createCounter = {
  plugin: {
    name: 'create-counter',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/example/create/counter',
          ...createCounterController.get
        },
        {
          method: 'POST',
          path: '/example/create/counter',
          ...createCounterController.post
        }
      ])
    }
  }
}
