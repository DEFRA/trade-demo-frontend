import { isPast, parseISO, subMinutes } from 'date-fns'
import { refreshTokens } from '../../auth/refresh-tokens.js'
import { saveRedirectPath } from '../../auth/state.js'
import { config } from '../../config/config.js'

/**
 * Build login URL with preserved login_hint parameter
 *
 * Preserves login_hint from original request for cross-system SSO
 * Use cases:
 * - External system redirects with pre-filled email
 * - Email deep links with user identifier
 *
 * @param {Object} request - Hapi request object
 * @returns {string} Login URL with optional login_hint parameter
 */
function buildLoginUrl(request) {
  const loginHint = request.query.login_hint
  const trimmed = loginHint ? String(loginHint).trim() : ''
  if (trimmed) {
    const encoded = encodeURIComponent(trimmed)
    return `/auth/login?login_hint=${encoded}`
  }
  return '/auth/login'
}

/**
 * Yar Session Authentication Scheme
 *
 * Custom Hapi authentication scheme for validating Redis-backed sessions.
 * Handles session validation, token refresh, and authentication modes.
 *
 * Features:
 * - Validates session data from yar (Redis)
 * - Automatically refreshes expired access tokens
 * - Supports 'required', 'try', and 'optional' auth modes
 * - Redirects to login on authentication failure
 *
 * @returns {Object} Hapi authentication scheme
 */
export function yarSessionScheme() {
  return {
    authenticate: async (request, h) => {
      // Get session data from yar (Redis-backed session storage)
      const sessionData = request.yar.get('auth')

      // Check authentication mode from route configuration
      const authMode = request.route.settings.auth.mode

      if (!sessionData) {
        // No session data
        if (authMode === 'try' || authMode === 'optional') {
          // For 'try' or 'optional' mode, allow request to proceed without credentials
          return h.authenticated({ credentials: {} })
        }

        // For 'required' mode, save original path and redirect to login
        saveRedirectPath(request, request.path)
        return h.redirect(buildLoginUrl(request)).takeover()
      }

      // Check if token has expired (with 1-minute buffer)
      const tokenHasExpired = isPast(
        subMinutes(parseISO(sessionData.expiresAt), 1)
      )

      if (tokenHasExpired && sessionData.refreshToken) {
        try {
          // Extract trace ID for CDP request tracking
          const tracingHeader = config.get('tracing.header')
          const traceId = request.headers[tracingHeader]

          // Attempt to refresh the access token
          const newTokens = await refreshTokens(
            sessionData.refreshToken,
            traceId
          )

          // Update session with new tokens
          const updatedSession = {
            ...sessionData,
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token,
            expiresAt: new Date(
              Date.now() + newTokens.expires_in * 1000
            ).toISOString()
          }

          request.yar.set('auth', updatedSession)

          return h.authenticated({ credentials: updatedSession })
        } catch (error) {
          // Token refresh failed - clear session
          request.yar.clear('auth')

          if (authMode === 'try' || authMode === 'optional') {
            // Allow request to proceed without credentials
            return h.authenticated({ credentials: {} })
          }

          // For 'required' mode, redirect to login
          saveRedirectPath(request, request.path)
          return h.redirect(buildLoginUrl(request)).takeover()
        }
      }

      return h.authenticated({ credentials: sessionData })
    }
  }
}
