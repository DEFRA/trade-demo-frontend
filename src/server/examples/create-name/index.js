import { createNameController } from './controller.js'

export const createName = {
  plugin: {
    name: 'create-name',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/example/create/name',
          ...createNameController.get
        },
        {
          method: 'POST',
          path: '/example/create/name',
          ...createNameController.post
        }
      ])
    }
  }
}
