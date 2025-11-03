import Bell from '@hapi/bell'
import Cookie from '@hapi/cookie'
import jwt from '@hapi/jwt'
import { isPast, parseISO, subMinutes } from 'date-fns'
import { config } from '../config/config.js'
import { getOidcEndpoints } from '../auth/oidc-well-known-discovery.js'
import { getDefraIdStrategy } from './auth/defra-id-strategy.js'
import { refreshTokens } from '../auth/refresh-tokens.js'

/**
 * Authentication Plugin
 *
 * Registers and configures authentication strategies:
 * - 'defra-id': Bell OAuth2/OIDC strategy for initial authentication
 * - 'session': @hapi/cookie strategy with custom validate for protected routes
 *
 * Uses @hapi/cookie for validation + Yar for Redis server-side storage
 * Token refresh happens transparently in cookie validate function
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

      // Configure 'session' strategy using @hapi/cookie with custom validate
      // Validate reads from Yar (server-side Redis) and handles token refresh
      server.auth.strategy('session', 'cookie', {
        cookie: {
          name: 'sid',
          password: config.get('session.cookie.password'),
          isSecure: config.get('session.cookie.secure'),
          path: '/',
          ttl: config.get('session.cookie.ttl')
        },
        redirectTo: (request) => {
          // Preserve login_hint parameter if present for cross-system SSO
          const loginHint = request.query.login_hint
          const trimmed = loginHint ? String(loginHint).trim() : ''
          if (trimmed) {
            return `/auth/login?login_hint=${encodeURIComponent(trimmed)}`
          }
          return '/auth/login'
        },
        appendNext: true, // Preserves original URL in query parameter

        /**
         * Custom validate function that reads session from Yar (server-side)
         * and automatically refreshes expired access tokens
         *
         * @param {Object} request - Hapi request object
         * @param {Object} session - Cookie session data (minimal, from @hapi/cookie)
         * @returns {Promise<Object>} Validation result with credentials
         */
        validate: async (request, session) => {
          // Read full auth data from Yar (Redis) - source of truth
          const authData = request.yar.get('auth')

          if (!authData) {
            return { isValid: false }
          }

          // Check if access token has expired (with 1-minute buffer)
          const tokenExpired = isPast(
            subMinutes(parseISO(authData.expiresAt), 1)
          )

          if (tokenExpired && authData.refreshToken) {
            try {
              // Extract trace ID for CDP request tracking
              const tracingHeader = config.get('tracing.header')
              const traceId = request.headers[tracingHeader]

              // Attempt to refresh the access token
              const newTokens = await refreshTokens(
                authData.refreshToken,
                traceId
              )

              // Update Yar session with new tokens
              const updatedAuth = {
                ...authData,
                accessToken: newTokens.access_token,
                refreshToken: newTokens.refresh_token,
                expiresAt: new Date(
                  Date.now() + newTokens.expires_in * 1000
                ).toISOString()
              }
              request.yar.set('auth', updatedAuth)

              return { isValid: true, credentials: updatedAuth }
            } catch (error) {
              // Token refresh failed - clear session
              request.yar.clear('auth')
              return { isValid: false }
            }
          }

          return { isValid: true, credentials: authData }
        }
      })

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
