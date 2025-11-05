/**
 * DEFRA ID Stub Test Helper
 *
 * Provides utilities for interacting with the DEFRA ID stub during testing.
 * Converted from scripts/register-test-user.sh for programmatic test use.
 *
 * Key capabilities:
 * - Register test users via stub API
 * - Wait for stub health/readiness
 * - Create test user fixtures
 *
 * Note: Stub uses memory cache - users are ephemeral and lost on container restart
 */

import { randomUUID } from 'node:crypto'
import { config } from '../config/config.js'
import { getOidcEndpoints } from '../auth/oidc-well-known-discovery.js'

/**
 * Derive stub base URL from OIDC discovery URL in config
 *
 * @returns {string} Stub base URL (e.g., http://localhost:3200/cdp-defra-id-stub)
 */
function getStubBaseUrl() {
  const oidcUrl = config.get('defraId.oidcDiscoveryUrl')
  // Remove /.well-known/openid-configuration to get base URL
  return oidcUrl.replace('/.well-known/openid-configuration', '')
}

/**
 * Register a test user with the DEFRA ID stub
 *
 * @param {Object} userData - User registration data
 * @param {string} userData.userId - UUID for user
 * @param {string} userData.email - User email address
 * @param {string} userData.firstName - User first name
 * @param {string} userData.lastName - User last name
 * @param {string} userData.loa - Level of Assurance (e.g., '1')
 * @param {string} userData.aal - Authenticator Assurance Level (e.g., '1')
 * @param {number} userData.enrolmentCount - Number of enrolments
 * @param {number} userData.enrolmentRequestCount - Number of enrolment requests
 * @param {Array} userData.relationships - User's organisational relationships
 * @returns {Promise<Object>} Registration response
 * @throws {Error} If registration fails
 */
export async function registerUser(userData) {
  const baseUrl = getStubBaseUrl()
  const url = `${baseUrl}/API/register`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `User registration failed: ${response.status} ${response.statusText}\n${body}`
    )
  }

  // Return response body if available (stub may return 200/201 with empty body)
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return await response.json()
  }

  return { success: true, status: response.status }
}

/**
 * Wait for DEFRA ID stub to be healthy/ready
 *
 * Polls the OIDC discovery endpoint until it responds successfully
 * Uses existing getOidcEndpoints() function for consistency
 *
 * @param {number} maxAttempts - Maximum number of health check attempts (default: 30)
 * @param {number} delayMs - Delay between attempts in milliseconds (default: 1000)
 * @returns {Promise<Object>} OIDC endpoints when stub is ready
 * @throws {Error} If stub doesn't become healthy within max attempts
 */
export async function waitForHealth(maxAttempts = 30, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Use existing getOidcEndpoints which checks the health endpoint
      const endpoints = await getOidcEndpoints()
      return endpoints
    } catch (error) {
      // Stub not ready yet
      if (attempt === maxAttempts) {
        throw new Error(
          `DEFRA ID stub failed to become ready after ${maxAttempts} attempts: ${error.message}`
        )
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

/**
 * Create a test user fixture with required core fields and sensible defaults
 *
 * @param {Object} params - User parameters
 * @param {string} params.email - REQUIRED: User email address
 * @param {string} params.firstName - REQUIRED: User first name
 * @param {string} params.lastName - REQUIRED: User last name
 * @param {string} [params.userId] - Optional: UUID (auto-generated if not provided)
 * @param {string} [params.loa] - Optional: Level of Assurance (default: '1')
 * @param {string} [params.aal] - Optional: Authenticator Assurance Level (default: '1')
 * @param {number} [params.enrolmentCount] - Optional: Number of enrolments (default: 1)
 * @param {number} [params.enrolmentRequestCount] - Optional: Number of enrolment requests (default: 1)
 * @param {Array} [params.relationships] - Optional: Organisational relationships (default: test org)
 * @returns {Object} Complete user registration object
 * @throws {Error} If required fields are missing
 */
export function createTestUser(params) {
  // Validate required fields
  if (!params.email) {
    throw new Error('createTestUser: email is required')
  }
  if (!params.firstName) {
    throw new Error('createTestUser: firstName is required')
  }
  if (!params.lastName) {
    throw new Error('createTestUser: lastName is required')
  }

  // Default relationships for test users
  const defaultRelationships = [
    {
      organisationName: 'Test Organisation',
      relationshipRole: 'Employee',
      roleName: 'Admin',
      roleStatus: '1'
    }
  ]

  return {
    userId: params.userId || randomUUID(),
    email: params.email,
    firstName: params.firstName,
    lastName: params.lastName,
    loa: params.loa || '1',
    aal: params.aal || '1',
    enrolmentCount: params.enrolmentCount ?? 1,
    enrolmentRequestCount: params.enrolmentRequestCount ?? 1,
    relationships: params.relationships || defaultRelationships
  }
}

// Re-export getOidcEndpoints for convenience
export { getOidcEndpoints }
