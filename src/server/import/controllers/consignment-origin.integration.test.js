/**
 * Integration tests for consignment origin controller
 * Tests actual HTTP requests/responses with real server
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { createTestUser } from '../../../test-helpers/defra-id-stub-helper.js'
import { sessionFromUser } from '../../../test-helpers/auth-test-helpers.js'

describe('consignmentOriginController integration', () => {
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

  describe('GET /import/consignment/origin', () => {
    test('Should display origin selection page when authenticated', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/import/consignment/origin',
        auth: {
          strategy: 'session',
          credentials: testSession
        }
      })

      expect(result).toEqual(
        expect.stringContaining(
          'Select the country where the animal originates from'
        )
      )
      expect(result).toEqual(expect.stringContaining('origin-country'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should redirect to login when not authenticated', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/import/consignment/origin'
      })

      expect(response.statusCode).toBe(statusCodes.movedTemporarily)
      expect(response.headers.location).toContain('/auth/login')
    })

    test('Should include GOV.UK form elements', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/import/consignment/origin',
        auth: {
          strategy: 'session',
          credentials: testSession
        }
      })

      // Check for form elements
      expect(result).toEqual(expect.stringContaining('<form'))
      expect(result).toEqual(expect.stringContaining('origin-country'))
      expect(result).toEqual(expect.stringContaining('Save and continue'))
    })
  })

  describe('POST /import/consignment/origin', () => {
    test('Should save valid country and redirect to purpose screen', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/import/consignment/origin',
        auth: {
          strategy: 'session',
          credentials: testSession
        },
        payload: {
          'origin-country': 'FR'
        }
      })

      expect(response.statusCode).toBe(statusCodes.movedTemporarily)
      expect(response.headers.location).toBe('/import/commodity/codes')
    })

    test('Should trim whitespace from country code', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/import/consignment/origin',
        auth: {
          strategy: 'session',
          credentials: testSession
        },
        payload: {
          'origin-country': '  GB  '
        }
      })

      expect(response.statusCode).toBe(statusCodes.movedTemporarily)
      expect(response.headers.location).toBe('/import/commodity/codes')
    })

    test('Should show error when country is empty', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/import/consignment/origin',
        auth: {
          strategy: 'session',
          credentials: testSession
        },
        payload: {
          'origin-country': ''
        }
      })

      expect(result).toEqual(expect.stringContaining('Select the country'))
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(statusCode).toBe(statusCodes.badRequest)
    })

    test('Should preserve entered value on validation error', async () => {
      const { result } = await server.inject({
        method: 'POST',
        url: '/import/consignment/origin',
        auth: {
          strategy: 'session',
          credentials: testSession
        },
        payload: {
          'origin-country': ''
        }
      })

      // Form should be re-rendered with the error
      expect(result).toEqual(expect.stringContaining('origin-country'))
    })

    test('Should redirect to login when not authenticated', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/import/consignment/origin',
        payload: {
          'origin-country': 'FR'
        }
      })

      expect(response.statusCode).toBe(statusCodes.movedTemporarily)
      expect(response.headers.location).toContain('/auth/login')
    })
  })
})
