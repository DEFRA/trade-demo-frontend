/**
 * Dashboard Controller
 *
 * Entry point to the trade imports journey - requires authentication.
 * Displays user data from Redis session after OIDC authentication.
 *
 * @see src/server/dashboard/index.js for route registration
 * @see src/server/auth/controller.js for session creation
 */

import { format } from 'date-fns'
import { getSessionValue } from '../common/helpers/session-helpers.js'
import { getOidcEndpoints } from '../../auth/oidc-well-known-discovery.js'

/**
 * Factory function to create dashboard controller with injected dependencies
 * @param {Function} getSessionValue - Async function to retrieve session data (defaults to fake implementation)
 * @param {Function} getEndpoints - Async function to retrieve OIDC endpoints (defaults to fake implementation)
 * @returns {Object} Controller with async handler method
 */
export const createDashboardController = function (
  getSessionValue = getFakeSessionValue, // fake implementation for development/testing
  getEndpoints = getFakeOidcEndpoints
) {
  return {
    /**
     * GET /dashboard
     */
    async handler(request, h) {
      // Retrieve authentication data from session
      // This was set by /auth/callback after successful login
      const authData = await getSessionValue(request, 'auth')

      // Fetch OIDC endpoints with error handling
      let oidcEndpoints = null
      let oidcError = null

      try {
        oidcEndpoints = await getEndpoints()
      } catch (error) {
        oidcError = error.message
      }

      // Format expiration date if present
      let formattedExpiresAt = null
      if (authData?.expiresAt) {
        try {
          formattedExpiresAt = format(
            new Date(authData.expiresAt),
            "MMMM d, yyyy 'at' h:mm a"
          )
        } catch (error) {
          // If date parsing fails, leave as null
          formattedExpiresAt = null
        }
      }

      return h.view('dashboard/index', {
        pageTitle: 'Dashboard',
        heading: 'Trade Imports Dashboard',
        user: {
          displayName: authData?.displayName,
          email: authData?.email,
          contactId: authData?.contactId,
          roles: authData?.roles,
          relationships: authData?.relationships,
          aal: authData?.aal,
          loa: authData?.loa,
          expiresAt: formattedExpiresAt
        },
        showImportsLink: true,
        oidcEndpoints,
        oidcError
      })
    }
  }
}

/**
 * Fake session value function for development/testing
 * @param {Object} request - Hapi request object
 * @param {string} key - Session key to retrieve
 * @returns {Promise<Object>} Fake session data
 */
export async function getFakeSessionValue(request, key) {
  return {
    displayName: 'Importer H Coded',
    email: 'hard@coded.com',
    contactId: '00000000000'
  }
}

/**
 * Fake OIDC endpoints function for development/testing
 * @returns {Promise<Object>} Fake OIDC endpoints
 */
export async function getFakeOidcEndpoints() {
  return {
    authorization_endpoint: 'https://fake-auth-server/authorize',
    token_endpoint: 'https://fake-auth-server/token',
    end_session_endpoint: 'https://fake-auth-server/logout',
    jwks_uri: 'https://fake-auth-server/jwks',
    issuer: 'https://fake-auth-server'
  }
}

// Production export uses real session from Redis
export const dashboardController = createDashboardController(
  getSessionValue,
  getOidcEndpoints
)
