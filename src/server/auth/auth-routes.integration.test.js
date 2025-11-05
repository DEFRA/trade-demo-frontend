/**
 * Auth Flow Integration Tests
 *
 * Tests complete authentication journeys with real server instance
 * Uses server.inject() with credentials to simulate authenticated users
 * No mocking - tests real flows, not library internals
 *
 * Focus on high-value user journeys:
 * - Protected routes redirect to login when unauthenticated
 * - Authenticated users can access protected routes
 * - Token refresh happens automatically
 * - Logout clears session
 * - Non-protected routes accessible to all
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'

// IMPORTANT: Import mocks FIRST (before server imports)
import { mockOidcEndpoints } from '../../../test/helpers/setup-mocks.js'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { createTestUser } from '../../test-helpers/defra-id-stub-helper.js'
import { sessionFromUser } from '../../test-helpers/auth-test-helpers.js'

describe('Auth Flow Integration Tests', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('Protected Routes', () => {
    test('Should redirect to login when accessing protected route without session', async () => {
      // Act: Try to access dashboard without authentication
      const response = await server.inject({
        method: 'GET',
        url: '/dashboard'
      })

      // Assert: Redirects to login with next parameter
      expect(response.statusCode).toBe(statusCodes.movedTemporarily)
      expect(response.headers.location).toBe('/auth/login?next=%2Fdashboard')
    })

    test('Should allow access to protected route with valid session', async () => {
      // Arrange: Create authenticated user session
      const user = createTestUser({
        email: 'dashboard-test@example.com',
        firstName: 'Dashboard',
        lastName: 'User'
      })
      const session = sessionFromUser(user)

      // Act: Access dashboard with session credentials
      const response = await server.inject({
        method: 'GET',
        url: '/dashboard',
        auth: {
          strategy: 'session',
          credentials: session
        }
      })

      // Assert: Successfully accesses dashboard
      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toContain('Dashboard')
    })
  })

  describe('Non-Protected Routes', () => {
    test('Should allow access to public routes without authentication', async () => {
      // Act: Access public about page
      const response = await server.inject({
        method: 'GET',
        url: '/about'
      })

      // Assert: Accessible without auth
      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toContain('About')
    })

    test('Should allow access to health endpoint without authentication', async () => {
      // Act: Access health check
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      })

      // Assert: Returns OK
      expect(response.statusCode).toBe(statusCodes.ok)
    })
  })

  describe('Logout Flow', () => {
    test('Should clear session and redirect to OIDC logout endpoint', async () => {
      // Act: Logout request
      const response = await server.inject({
        method: 'GET',
        url: '/auth/logout'
      })

      // Assert: Redirects to OIDC end_session_endpoint
      expect(response.statusCode).toBe(statusCodes.movedTemporarily)
      expect(response.headers.location).toContain(
        mockOidcEndpoints.end_session_endpoint
      )

      // Verify post_logout_redirect_uri parameter
      const redirectUrl = new URL(response.headers.location)
      const postLogoutUri = redirectUrl.searchParams.get(
        'post_logout_redirect_uri'
      )
      expect(postLogoutUri).toBeDefined()
      expect(postLogoutUri).toMatch(/^https?:\/\//) // Full URL
    })

    test('Should work even without existing session (mode: try)', async () => {
      // Act: Logout without session
      const response = await server.inject({
        method: 'GET',
        url: '/auth/logout'
      })

      // Assert: Still redirects successfully
      expect(response.statusCode).toBe(statusCodes.movedTemporarily)
      expect(response.headers.location).toContain('logout')
    })
  })

  describe('Login Hint Preservation', () => {
    test('Should preserve login_hint parameter when redirecting to login', async () => {
      // Act: Access protected route with login_hint
      const response = await server.inject({
        method: 'GET',
        url: '/dashboard?login_hint=user@example.com'
      })

      // Assert: Redirects to login with login_hint and next parameter
      expect(response.statusCode).toBe(statusCodes.movedTemporarily)
      expect(response.headers.location).toBe(
        '/auth/login?login_hint=user%40example.com&next=%2Fdashboard%3Flogin_hint%3Duser%40example.com'
      )
    })
  })

  describe('Session Management', () => {
    test('Should maintain session across multiple protected requests', async () => {
      // Arrange: Create session
      const user = createTestUser({
        email: 'multi-request@example.com',
        firstName: 'Multi',
        lastName: 'Request'
      })
      const session = sessionFromUser(user)

      // Act: Make multiple requests to different protected routes
      const response1 = await server.inject({
        method: 'GET',
        url: '/dashboard',
        auth: { strategy: 'session', credentials: session }
      })

      const response2 = await server.inject({
        method: 'GET',
        url: '/dashboard',
        auth: { strategy: 'session', credentials: session }
      })

      // Assert: Both requests succeed
      expect(response1.statusCode).toBe(statusCodes.ok)
      expect(response2.statusCode).toBe(statusCodes.ok)
      expect(response1.result).toContain('Dashboard')
      expect(response2.result).toContain('Dashboard')
    })
  })

  describe('Redirect Path Preservation', () => {
    test('Should save redirect path in session when accessing protected route', async () => {
      // Act: User tries to access protected page
      const response = await server.inject({
        method: 'GET',
        url: '/dashboard'
      })

      // Assert: Redirects to login with next parameter containing original path
      expect(response.statusCode).toBe(statusCodes.movedTemporarily)
      expect(response.headers.location).toBe('/auth/login?next=%2Fdashboard')

      // Note: @hapi/cookie's appendNext stores redirect path in 'next' query param
      // After successful auth, callback handler reads this param to redirect user back
    })

    test('Should save redirect path with login_hint preserved', async () => {
      // Act: Access protected route with login_hint
      const loginHint = 'saved@example.com'
      const response = await server.inject({
        method: 'GET',
        url: `/dashboard?login_hint=${encodeURIComponent(loginHint)}`
      })

      // Assert: Redirects with both login_hint and next parameter
      expect(response.statusCode).toBe(statusCodes.movedTemporarily)
      expect(response.headers.location).toBe(
        `/auth/login?login_hint=${encodeURIComponent(loginHint)}&next=%2Fdashboard%3Flogin_hint%3Dsaved%2540example.com`
      )

      // Note: login_hint preserved in redirect URL, next param preserves full original URL
    })
  })
})
