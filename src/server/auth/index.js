/**
 * Authentication Routes Plugin
 *
 * Registers OAuth2/OIDC authentication routes for DEFRA ID integration.
 * Implements standard OAuth2 authorization code flow with PKCE.
 *
 * Routes:
 * - GET /auth/login: Initiates OAuth flow (Bell intercepts and redirects)
 * - GET /auth/callback: Handles OAuth callback, creates session
 * - GET /auth/logout: Clears session and redirects to DEFRA ID logout
 *
 * Authentication Strategies:
 * - 'defra-id': Bell OAuth2 strategy (login, callback)
 * - 'session-cookie': Custom session validation (logout with mode: 'try')
 *
 * @see src/plugins/auth.js for strategy configuration
 */

import jwt from '@hapi/jwt'
import { config } from '../../config/config.js'
import { getOidcEndpoints } from '../../auth/oidc-well-known-discovery.js'
import {
  setSessionValue,
  clearSessionValue
} from '../common/helpers/session-helpers.js'

/**
 * GET /auth/login
 *
 * Initiates OAuth2 authorization code flow with DEFRA Customer Identity Service
 * Bell intercepts this route and redirects to DEFRA ID authorization endpoint
 * Handler only executes on error or during unit testing
 */
const login = {
  method: 'GET',
  path: '/auth/login',
  handler(request, h) {
    // Bell intercepts requests to this route and handles OAuth2 redirect
    // This fallback handler only executes if Bell encounters an error
    // or during unit testing when Bell is not active
    request.logger.info(
      'OAuth login initiated (fallback handler - Bell should intercept)'
    )
    return h.redirect('/')
  },
  options: {
    auth: {
      strategy: 'defra-id',
      mode: 'required'
    },
    description: 'Initiate DEFRA ID authentication',
    notes: 'Redirects to DEFRA ID authorization endpoint'
  }
}

/**
 * GET /auth/callback
 *
 * OAuth2 callback endpoint - receives authorization code and creates session
 * Bell handles token exchange and validation before this handler executes
 */
const callback = {
  method: 'GET',
  path: '/auth/callback',
  async handler(request, h) {
    try {
      // Debug: Log callback entry with query params and cookie state
      request.logger.info(
        {
          query: request.query,
          hasCookie: !!request.state['bell-defra-id'],
          cookieKeys: Object.keys(request.state || {}),
          isAuthenticated: request.auth.isAuthenticated
        },
        'OAuth callback received'
      )

      // Bell has already validated tokens and made them available in request.auth
      const { credentials } = request.auth
      request.logger.info(
        {
          isAuthenticated: request.auth.isAuthenticated,
          hasAccessToken: !!credentials?.token,
          hasRefreshToken: !!credentials?.refreshToken
        },
        'Bell authentication completed'
      )

      // Decode ID token to access DEFRA-specific claims
      // Bell validates the token signature, but doesn't parse custom claims
      const idToken = credentials.token
      request.logger.info('Decoding ID token')
      const decoded = jwt.token.decode(idToken)
      const claims = decoded.decoded.payload
      request.logger.info(
        { contactId: claims.contactId, email: claims.email },
        'Token claims extracted'
      )

      // Construct session data object
      const sessionData = {
        contactId: claims.contactId,
        email: claims.email,
        displayName: claims.given_name || claims.email,
        accessToken: credentials.token,
        refreshToken: credentials.refreshToken,
        expiresAt: new Date(
          Date.now() + credentials.expiresIn * 1000
        ).toISOString(),
        relationships: claims.relationships || [],
        roles: claims.roles || [],
        aal: claims.aal,
        loa: claims.loa
      }

      // Store session server-side (Redis in production, memory in dev)
      request.logger.info('Storing session data')
      setSessionValue(request, 'auth', sessionData)

      // Set cookie auth (creates encrypted cookie with minimal data)
      request.cookieAuth.set({ authenticated: true })

      // Redirect to original page or homepage (clear after reading)
      const nextUrl = credentials.query?.next
      const redirect = nextUrl ? decodeURIComponent(nextUrl) : '/'
      request.logger.info(
        { redirect },
        'Redirecting after successful authentication'
      )

      return h.redirect(redirect)
    } catch (error) {
      request.logger.error(
        { err: error, stack: error.stack },
        'OAuth callback error'
      )
      throw error
    }
  },
  options: {
    auth: {
      strategy: 'defra-id',
      mode: 'required'
    },
    description: 'DEFRA ID OAuth2 callback',
    notes: 'Handles OAuth2 callback and creates user session'
  }
}

/**
 * GET /auth/logout
 *
 * Logs user out of both this application and DEFRA Customer Identity Service
 * Clears session and redirects to DEFRA ID logout endpoint for SSO logout
 */
const logout = {
  method: 'GET',
  path: '/auth/logout',
  async handler(request, h) {
    // Clear session
    clearSessionValue(request, 'auth')

    // Clear cookie
    request.cookieAuth.clear()

    const oidcEndpoints = await getOidcEndpoints()
    const postLogoutUri = config.get('appBaseUrl')
    const logoutUrl = `${oidcEndpoints.end_session_endpoint}?post_logout_redirect_uri=${encodeURIComponent(postLogoutUri)}`
    return h.redirect(logoutUrl)
  },
  options: {
    auth: {
      strategy: 'session',
      mode: 'try'
    },
    description: 'Logout from DEFRA ID',
    notes: 'Clears session and redirects to DEFRA ID logout'
  }
}

export const auth = {
  plugin: {
    name: 'auth-routes',
    register(server) {
      server.route([login, callback, logout])
    }
  }
}
