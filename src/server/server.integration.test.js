import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from './server.js'
import { statusCodes } from './common/constants/status-codes.js'

/**
 * Server Integration Tests
 *
 * Tests full server startup with all plugins registered.
 * These tests validate that:
 * - All plugins load without errors
 * - Plugin dependencies resolve correctly (auth strategies, etc.)
 * - Routes are properly configured
 */
describe('Server Integration Tests', () => {
  let server

  beforeAll(async () => {
    // Create server with full plugin stack
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  describe('Health Endpoint', () => {
    test('Should respond to health check', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toEqual({ message: 'success' })
    })
  })

  describe('Server Configuration', () => {
    test('Should initialize server without errors', () => {
      // If we got here, all plugins loaded successfully
      expect(server).toBeDefined()
      expect(server.info).toBeDefined()
    })

    test('Should have routes registered', () => {
      const routes = server.table()

      // Verify key routes exist
      const paths = routes.map((route) => route.path)

      expect(paths).toContain('/health')
      expect(paths).toContain('/')
      expect(paths).toContain('/about')
    })

    test('Should have auth routes registered', () => {
      const routes = server.table()
      const paths = routes.map((route) => route.path)

      // Verify authentication routes exist
      expect(paths).toContain('/auth/login')
      expect(paths).toContain('/auth/callback')
      expect(paths).toContain('/auth/logout')
    })
  })
})
