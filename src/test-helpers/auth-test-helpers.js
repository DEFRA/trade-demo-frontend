/**
 * Authentication Test Helpers
 *
 * Provides test utilities for authentication testing
 */

import { randomUUID } from 'node:crypto'

/**
 * Convert stub user to session format
 *
 * Creates session data matching production structure (src/routes/auth-routes.js)
 * Use this in integration tests after registering user with stub
 *
 * @param {Object} user - User object from createTestUser()
 * @param {Object} tokenOverrides - Optional token/expiry overrides
 * @returns {Object} Session object for server.inject({ credentials })
 *
 * @example
 * const user = createTestUser({ email: 'test@example.com', firstName: 'Test', lastName: 'User' })
 * const session = sessionFromUser(user)
 * // Returns: { contactId, email, displayName, accessToken, refreshToken, expiresAt, ... }
 *
 * @example Expired session
 * const expiredSession = sessionFromUser(user, {
 *   expiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
 * })
 */
export function sessionFromUser(user, tokenOverrides = {}) {
  const now = Date.now()
  const expiresIn = tokenOverrides.expiresIn || 3600 // 1 hour in seconds

  return {
    contactId: user.userId,
    email: user.email,
    displayName: user.firstName,
    accessToken:
      tokenOverrides.accessToken || `mock-access-token-${randomUUID()}`,
    refreshToken:
      tokenOverrides.refreshToken || `mock-refresh-token-${randomUUID()}`,
    expiresAt:
      tokenOverrides.expiresAt ||
      new Date(now + expiresIn * 1000).toISOString(),
    relationships: user.relationships || [],
    roles: ['Admin'], // Default role for test users
    aal: user.aal,
    loa: user.loa
  }
}
