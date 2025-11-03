import { describe, expect, test, vi } from 'vitest'
import { getDefraIdStrategy } from './defra-id-strategy.js'
import { mockOidcEndpoints } from '../../../test/helpers/setup-mocks.js'

describe('DEFRA ID Strategy Configuration', () => {
  const mockConfig = {
    get: vi.fn((key) => {
      const values = {
        appBaseUrl: 'http://localhost:3000',
        'session.cookie.password': 'test-password-at-least-32-characters',
        'defraId.clientId': 'test-client-id',
        'defraId.clientSecret': 'test-client-secret',
        'defraId.serviceId': 'test-service-id',
        'auth.forceHttps': false,
        'auth.secure': false
      }
      return values[key]
    })
  }

  describe('Strategy structure', () => {
    test('Should return complete Bell strategy configuration', () => {
      const strategy = getDefraIdStrategy(mockConfig, mockOidcEndpoints)

      expect(strategy).toHaveProperty('location')
      expect(strategy).toHaveProperty('provider')
      expect(strategy).toHaveProperty('password')
      expect(strategy).toHaveProperty('clientId')
      expect(strategy).toHaveProperty('clientSecret')
      expect(strategy).toHaveProperty('providerParams')
      expect(strategy).toHaveProperty('config')
    })

    test('Should configure PKCE for security', () => {
      const strategy = getDefraIdStrategy(mockConfig, mockOidcEndpoints)

      expect(strategy.config.usePKCE).toBe(true)
    })

    test('Should use OIDC endpoints from discovery', () => {
      const strategy = getDefraIdStrategy(mockConfig, mockOidcEndpoints)

      expect(strategy.provider.auth).toBe(
        mockOidcEndpoints.authorization_endpoint
      )
      expect(strategy.provider.token).toBe(mockOidcEndpoints.token_endpoint)
    })
  })

  describe('location callback', () => {
    test('Should be a function not a string', () => {
      const strategy = getDefraIdStrategy(mockConfig, mockOidcEndpoints)

      expect(typeof strategy.location).toBe('function')
    })

    test('Should return exact callback URL without modification', () => {
      const strategy = getDefraIdStrategy(mockConfig, mockOidcEndpoints)

      const callbackUrl = strategy.location()

      expect(callbackUrl).toBe('http://localhost:3000/auth/callback')
    })
  })

  describe('providerParams - serviceId', () => {
    test('Should always include serviceId - REQUIRED by DEFRA ID', () => {
      // serviceId is CRITICAL: DEFRA ID uses this to route authentication requests
      // Without it, authentication will fail at the DEFRA ID authorization endpoint
      const strategy = getDefraIdStrategy(mockConfig, mockOidcEndpoints)
      const mockRequest = { query: {} }

      const params = strategy.providerParams(mockRequest)

      expect(params.serviceId).toBe('test-service-id')
    })
  })

  describe('providerParams - login_hint', () => {
    test('Should include login_hint when present in query', () => {
      const strategy = getDefraIdStrategy(mockConfig, mockOidcEndpoints)
      const mockRequest = {
        query: { login_hint: 'user@example.com' }
      }

      const params = strategy.providerParams(mockRequest)

      expect(params.login_hint).toBe('user@example.com')
    })

    test('Should trim whitespace from login_hint', () => {
      const strategy = getDefraIdStrategy(mockConfig, mockOidcEndpoints)
      const mockRequest = {
        query: { login_hint: '  user@example.com  ' }
      }

      const params = strategy.providerParams(mockRequest)

      expect(params.login_hint).toBe('user@example.com')
    })

    test('Should omit login_hint when not in query', () => {
      const strategy = getDefraIdStrategy(mockConfig, mockOidcEndpoints)
      const mockRequest = { query: {} }

      const params = strategy.providerParams(mockRequest)

      expect(params).not.toHaveProperty('login_hint')
    })

    test('Should ignore empty login_hint', () => {
      const strategy = getDefraIdStrategy(mockConfig, mockOidcEndpoints)
      const mockRequest = {
        query: { login_hint: '' }
      }

      const params = strategy.providerParams(mockRequest)

      expect(params).not.toHaveProperty('login_hint')
    })

    test('Should ignore whitespace-only login_hint', () => {
      const strategy = getDefraIdStrategy(mockConfig, mockOidcEndpoints)
      const mockRequest = {
        query: { login_hint: '   ' }
      }

      const params = strategy.providerParams(mockRequest)

      expect(params).not.toHaveProperty('login_hint')
    })

    test('Should handle special characters in login_hint', () => {
      const strategy = getDefraIdStrategy(mockConfig, mockOidcEndpoints)
      const mockRequest = {
        query: { login_hint: 'user+test@example.com' }
      }

      const params = strategy.providerParams(mockRequest)

      expect(params.login_hint).toBe('user+test@example.com')
    })
  })
})
