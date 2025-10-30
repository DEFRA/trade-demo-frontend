/**
 * Dashboard Controller
 *
 * Entry point to the trade imports journey - eventually will require authentication.
 * For the moment just provides hard coded user data...
 *
 * @see src/server/dashboard/index.js for route registration
 * @see src/server/auth/controller.js for session creation
 */

import { getOidcEndpoints } from '../common/helpers/oidc-well-known-discovery.js'

/**
 * Factory function to create dashboard controller with injected dependencies
 * @param {Function} getSessionValue - Async function to retrieve session data (defaults to fake implementation)
 * @param {Function} getEndpoints - Async function to retrieve OIDC endpoints (defaults to fake implementation)
 * @returns {Object} Controller with async handler method
 */
export const createDashboardController = function (
  getSessionValue = getFakeSessionValue,
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

      return h.view('dashboard/index', {
        pageTitle: 'Dashboard',
        heading: 'Trade Imports Dashboard',
        user: {
          displayName: authData.displayName,
          email: authData.email,
          contactId: authData.contactId
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

// Default export uses fake session but real OIDC discovery
// When full authentication is implemented, replace getFakeSessionValue with:
// import { getSessionValue } from '../common/helpers/session-helpers.js'
// export const dashboardController = createDashboardController(getSessionValue, getOidcEndpoints)
export const dashboardController = createDashboardController(
  getFakeSessionValue,
  getOidcEndpoints
)
