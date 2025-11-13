/**
 * Account Plugin
 *
 * Registers the protected account management route.
 * Displays user profile information and OIDC configuration.
 */

import { accountController } from './controller.js'

export const account = {
  plugin: {
    name: 'account',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/account',
          ...accountController,
          options: {
            ...accountController.options,
            auth: 'session', // Requires valid session, implemented by hapi-auth-cookie, configured in src/server/auth.js
            description: 'User account management',
            notes:
              'Protected route - displays user profile and session information. Requires valid session.'
          }
        }
      ])
    }
  }
}
