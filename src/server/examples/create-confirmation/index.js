import { createConfirmationController } from './controller.js'

export const createConfirmation = {
  plugin: {
    name: 'create-confirmation',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/example/create/confirmation',
          ...createConfirmationController,
          options: { ...createConfirmationController.options, auth: false }
        }
      ])
    }
  }
}
