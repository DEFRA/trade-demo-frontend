import { editController } from './controller.js'

export const edit = {
  plugin: {
    name: 'edit',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/example/{id}/edit',
          ...editController.get
        },
        {
          method: 'POST',
          path: '/example/{id}/edit',
          ...editController.post
        }
      ])
    }
  }
}
