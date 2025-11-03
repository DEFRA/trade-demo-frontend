import { config } from '../config/config.js'
import { getOidcEndpoints } from './oidc-well-known-discovery.js'

/**
 * Refresh OAuth2 Access Token
 *
 * Uses the refresh token to obtain a new access token from DEFRA ID.
 * Implements OAuth2 Refresh Token Grant (RFC 6749 Section 6).
 *
 * @param {string} refreshToken - OAuth2 refresh token
 * @param {string} traceId - CDP request trace ID for logging
 * @returns {Promise<Object>} New token response { access_token, refresh_token, expires_in }
 * @throws {Error} If token refresh fails
 */
export async function refreshTokens(refreshToken, traceId) {
  const oidcEndpoints = await getOidcEndpoints()
  const tokenEndpoint = oidcEndpoints.token_endpoint

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.get('defraId.clientId'),
    client_secret: config.get('defraId.clientSecret')
  })

  const tracingHeader = config.get('tracing.header')

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(traceId && { [tracingHeader]: traceId })
    },
    body: params.toString()
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`
    )
  }

  return await response.json()
}
