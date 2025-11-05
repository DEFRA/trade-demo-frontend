/**
 * Global Test Mocks
 *
 * Module-level mocks applied to all integration tests
 * Import this file at the top of integration test files
 *
 * Pattern from fcp-sfd-frontend:
 * - Mock external dependencies (OIDC discovery, APIs)
 * - Avoid network calls during tests
 * - Provide consistent test environment
 */

import { vi } from 'vitest'

/**
 * Mock OIDC discovery endpoints
 * Used by getOidcEndpoints() function
 */
export const mockOidcEndpoints = {
  authorization_endpoint: 'https://mock-oidc.example.com/authorize',
  token_endpoint: 'https://mock-oidc.example.com/token',
  end_session_endpoint: 'https://mock-oidc.example.com/logout',
  jwks_uri: 'https://mock-oidc.example.com/jwks',
  issuer: 'https://mock-oidc.example.com'
}

/**
 * Mock OIDC well-known discovery
 * Prevents network calls to real OIDC provider during tests
 */
vi.mock('../../src/auth/oidc-well-known-discovery.js', async () => ({
  getOidcEndpoints: vi.fn(async () => mockOidcEndpoints)
}))
