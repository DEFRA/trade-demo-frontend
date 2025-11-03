import jwt from '@hapi/jwt'

/**
 * DEFRA ID using 'Bell Strategy'
 *
 * Returns Bell OAuth2/OIDC strategy configuration for DEFRA ID authentication.
 * Handles OAuth flow, token exchange, and user profile extraction (scopes tbc).
 *
 * @param {Object} config - Application configuration
 * @param {Object} oidcEndpoints - OIDC discovery endpoints
 * @returns {Object} Bell strategy configuration
 */
export function getDefraIdStrategy(config, oidcEndpoints) {
  const callbackUrl = `${config.get('appBaseUrl')}/auth/callback`

  return {
    // IMPORTANT: location must be a function to prevent Bell from appending request.path
    // If location is a string, Bell appends the current route path to it
    // Function form returns the exact callback URL without modification
    location: () => callbackUrl,

    provider: {
      name: 'defra-id',
      protocol: 'oauth2',
      useParamsAuth: true,
      auth: oidcEndpoints.authorization_endpoint,
      token: oidcEndpoints.token_endpoint,
      scope: ['openid', 'profile', 'email', 'offline_access'],

      /**
       * Extract user profile from ID token
       * @param {Object} credentials - OAuth2 credentials from Bell
       * @param {Object} params - Token response parameters
       * @returns {Promise<Object>} User profile
       */
      profile: async (credentials, params) => {
        // Decode ID token to extract user claims
        const idToken = params.id_token
        const decoded = jwt.token.decode(idToken)
        const claims = decoded.decoded.payload

        return {
          id: claims.contactId,
          email: claims.email,
          displayName: claims.given_name,
          raw: claims
        }
      }
    },

    password: config.get('session.cookie.password'),
    clientId: config.get('defraId.clientId'),
    clientSecret: config.get('defraId.clientSecret'),
    forceHttps: config.get('auth.forceHttps'),
    isSecure: config.get('auth.secure'),

    // CRITICAL: DEFRA-specific parameter required for authentication
    providerParams: (request) => {
      const params = {
        serviceId: config.get('defraId.serviceId')
      }

      // Support OpenID Connect login_hint parameter for cross-system SSO
      if (request.query.login_hint) {
        const loginHint = String(request.query.login_hint).trim()
        // Basic validation: non-empty and reasonable length
        if (loginHint && loginHint.length <= 255) {
          params.login_hint = loginHint
        }
      }

      return params
    },

    // Enable PKCE (Proof Key for Code Exchange) for enhanced security
    config: {
      usePKCE: true
    }
  }
}
