import { createCheckController } from './controller.js'

export const createCheck = {
  plugin: {
    name: 'create-check',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/example/create/check',
          ...createCheckController.get,
          options: { ...createCheckController.get.options, auth: false }
        },
        {
          method: 'POST',
          path: '/example/create/check',
          ...createCheckController.post,
          options: { ...createCheckController.post.options, auth: false }
        }
      ])
    }
  }
}
