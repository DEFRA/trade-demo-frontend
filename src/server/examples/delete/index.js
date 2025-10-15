import { deleteController } from './controller.js'

export const deleteExample = {
  plugin: {
    name: 'delete',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/example/{id}/delete',
          ...deleteController.get
        },
        {
          method: 'POST',
          path: '/example/{id}/delete',
          ...deleteController.post
        }
      ])
    }
  }
}
