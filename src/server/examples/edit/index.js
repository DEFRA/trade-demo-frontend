import { editController } from './controller.js'

export const edit = {
  plugin: {
    name: 'edit',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/example/{id}/edit',
          ...editController.get,
          options: {
            ...editController.get.options,
            auth: false
          }
        },
        {
          method: 'POST',
          path: '/example/{id}/edit',
          ...editController.post,
          options: {
            ...editController.post.options,
            auth: false
          }
        }
      ])
    }
  }
}
