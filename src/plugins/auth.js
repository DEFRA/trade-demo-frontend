import Bell from '@hapi/bell'
import Cookie from '@hapi/cookie'
import jwt from '@hapi/jwt'
import { config } from '../config/config.js'
import { getOidcEndpoints } from '../auth/oidc-well-known-discovery.js'
import { yarSessionScheme } from './auth/yar-session-scheme.js'
import { getDefraIdStrategy } from './auth/defra-id-strategy.js'

/**
 * Authentication Plugin
 *
 * Registers and configures authentication strategies:
 * - 'defra-id': Bell OAuth2/OIDC strategy for initial authentication
 * - 'session-cookie': Custom session validation strategy for protected routes
 *
 * Sets 'session-cookie' as the default strategy (secure by default)
 *
 * @see https://hapi.dev/module/bell/ for Bell documentation
 * @see https://hapi.dev/module/cookie/ for Cookie authentication
 */
export const auth = {
  plugin: {
    name: 'auth',
    register: async (server) => {
      // Validate required configuration (fail-fast in production)
      const oidcDiscoveryUrl = config.get('defraId.oidcDiscoveryUrl')
      const clientId = config.get('defraId.clientId')
      const clientSecret = config.get('defraId.clientSecret')
      const serviceId = config.get('defraId.serviceId')

      if (!oidcDiscoveryUrl || !clientId || !clientSecret || !serviceId) {
        throw new Error(
          'Missing required DEFRA ID configuration. Please set DEFRA_ID_OIDC_DISCOVERY_URL, DEFRA_ID_CLIENT_ID, DEFRA_ID_CLIENT_SECRET, and DEFRA_ID_SERVICE_ID environment variables.'
        )
      }

      await server.register([Bell, Cookie, jwt])
      server.auth.scheme('yar-session', yarSessionScheme)
      server.auth.strategy('session-cookie', 'yar-session')

      // Configure 'defra-id' strategy using Bell (OAuth2/OIDC)
      // Fetch OIDC endpoints lazily to avoid network calls during tests
      const oidcEndpoints = await getOidcEndpoints()
      server.auth.strategy(
        'defra-id',
        'bell',
        getDefraIdStrategy(config, oidcEndpoints)
      )
    }
  }
}
