/**
 * Integration tests for consignment purpose controller
 * Tests guard redirects and form validation with real server
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { createTestUser } from '../../../test-helpers/defra-id-stub-helper.js'
import { sessionFromUser } from '../../../test-helpers/auth-test-helpers.js'

describe('consignmentPurposeController integration', () => {
  let server
  let testSession

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()

    // Create test user session for authenticated routes
    const user = createTestUser({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    })
    testSession = sessionFromUser(user)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /import/consignment/purpose', () => {
    test('Should redirect to origin when no origin-country in session (guard)', async () => {
      // Access purpose page directly without completing origin step
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/import/consignment/purpose',
        auth: {
          strategy: 'session',
          credentials: testSession
        }
      })

      expect(statusCode).toBe(statusCodes.movedTemporarily)
      expect(headers.location).toBe('/import/consignment/origin')
    })

    test('Should redirect to login when not authenticated', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/import/consignment/purpose'
      })

      expect(response.statusCode).toBe(statusCodes.movedTemporarily)
      expect(response.headers.location).toContain('/auth/login')
    })

    // Note: Testing successful GET requires session with origin-country set
    // This is better covered by journey flow integration tests
  })

  describe('POST /import/consignment/purpose', () => {
    test('Should redirect to origin when no origin-country in session (guard)', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/import/consignment/purpose',
        auth: {
          strategy: 'session',
          credentials: testSession
        },
        payload: {
          purpose: 'internalmarket',
          'internal-market-purpose': 'breeding'
        }
      })

      expect(statusCode).toBe(statusCodes.movedTemporarily)
      expect(headers.location).toBe('/import/consignment/origin')
    })

    test('Should redirect to login when not authenticated', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/import/consignment/purpose',
        payload: {
          purpose: 'internalmarket',
          'internal-market-purpose': 'breeding'
        }
      })

      expect(response.statusCode).toBe(statusCodes.movedTemporarily)
      expect(response.headers.location).toContain('/auth/login')
    })

    // Note: Testing successful POST with validation requires session with origin-country
    // This is better covered by journey flow integration tests
  })

  describe('Authentication enforcement', () => {
    test('Should require authentication for GET requests', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/import/consignment/purpose'
      })

      expect(response.statusCode).toBe(statusCodes.movedTemporarily)
      expect(response.headers.location).toMatch(/\/auth\/login/)
    })

    test('Should require authentication for POST requests', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/import/consignment/purpose',
        payload: {
          purpose: 're-entry'
        }
      })

      expect(response.statusCode).toBe(statusCodes.movedTemporarily)
      expect(response.headers.location).toMatch(/\/auth\/login/)
    })
  })
})
