import { beforeEach, describe, expect, test, vi } from 'vitest'
import { yarSessionScheme } from './yar-session-scheme.js'

// Mock dependencies
vi.mock('../../auth/refresh-tokens.js')
vi.mock('../../auth/state.js')

describe('Yar Session Scheme', () => {
  let refreshTokens
  let saveRedirectPath
  let mockYar
  let mockAuthResponse

  beforeEach(async () => {
    vi.resetModules()

    // Import mocked modules
    const refreshModule = await import('../../auth/refresh-tokens.js')
    refreshTokens = refreshModule.refreshTokens

    const stateModule = await import('../../auth/state.js')
    saveRedirectPath = stateModule.saveRedirectPath

    // Create fresh mock yar (session storage)
    mockYar = {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn()
    }

    // Create fresh mock auth response (Hapi response toolkit)
    mockAuthResponse = {
      redirect: vi.fn((url) => ({ url, takeover: vi.fn(() => 'redirect') })),
      authenticated: vi.fn((opts) => opts)
    }
  })

  describe('No session scenarios', () => {
    test('Should redirect to login when no session and mode is required', async () => {
      const scheme = yarSessionScheme()
      mockYar.get.mockReturnValue(null)

      const mockRequest = {
        yar: mockYar,
        query: {},
        path: '/dashboard',
        route: { settings: { auth: { mode: 'required' } } }
      }

      const result = await scheme.authenticate(mockRequest, mockAuthResponse)

      expect(saveRedirectPath).toHaveBeenCalledWith(mockRequest, '/dashboard')
      expect(mockAuthResponse.redirect).toHaveBeenCalledWith('/auth/login')
      expect(result).toBe('redirect')
    })

    test('Should allow access with empty credentials when no session and mode is try', async () => {
      const scheme = yarSessionScheme()
      mockYar.get.mockReturnValue(null)

      const mockRequest = {
        yar: mockYar,
        query: {},
        path: '/about',
        route: { settings: { auth: { mode: 'try' } } }
      }

      const result = await scheme.authenticate(mockRequest, mockAuthResponse)

      expect(mockAuthResponse.authenticated).toHaveBeenCalledWith({
        credentials: {}
      })
      expect(result).toEqual({ credentials: {} })
    })

    test('Should allow access with empty credentials when no session and mode is optional', async () => {
      const scheme = yarSessionScheme()
      mockYar.get.mockReturnValue(null)

      const mockRequest = {
        yar: mockYar,
        query: {},
        path: '/about',
        route: { settings: { auth: { mode: 'optional' } } }
      }

      const result = await scheme.authenticate(mockRequest, mockAuthResponse)

      expect(mockAuthResponse.authenticated).toHaveBeenCalledWith({
        credentials: {}
      })
      expect(result).toEqual({ credentials: {} })
    })
  })

  describe('Valid session scenarios', () => {
    test('Should authenticate with valid non-expired session', async () => {
      const scheme = yarSessionScheme()
      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      const sessionData = {
        contactId: '123',
        email: 'test@example.com',
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        expiresAt: futureDate
      }
      mockYar.get.mockReturnValue(sessionData)

      const mockRequest = {
        yar: mockYar,
        query: {},
        route: { settings: { auth: { mode: 'required' } } }
      }

      const result = await scheme.authenticate(mockRequest, mockAuthResponse)

      expect(mockAuthResponse.authenticated).toHaveBeenCalledWith({
        credentials: sessionData
      })
      expect(result).toEqual({ credentials: sessionData })
    })
  })

  describe('Expired token with refresh success', () => {
    test('Should refresh expired token and authenticate', async () => {
      const scheme = yarSessionScheme()
      const pastDate = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const sessionData = {
        contactId: '123',
        email: 'test@example.com',
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: pastDate
      }
      mockYar.get.mockReturnValue(sessionData)

      const newTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
      }
      refreshTokens.mockResolvedValue(newTokens)

      const mockRequest = {
        yar: mockYar,
        query: {},
        headers: { 'x-cdp-request-id': 'trace-123' },
        route: { settings: { auth: { mode: 'required' } } }
      }

      await scheme.authenticate(mockRequest, mockAuthResponse)

      expect(refreshTokens).toHaveBeenCalledWith(
        'valid-refresh-token',
        'trace-123'
      )
      expect(mockYar.set).toHaveBeenCalledWith(
        'auth',
        expect.objectContaining({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        })
      )
      expect(mockAuthResponse.authenticated).toHaveBeenCalledWith({
        credentials: expect.objectContaining({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        })
      })
    })

    test('Should refresh without trace ID when header not present', async () => {
      const scheme = yarSessionScheme()
      const pastDate = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const sessionData = {
        contactId: '123',
        email: 'test@example.com',
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: pastDate
      }
      mockYar.get.mockReturnValue(sessionData)

      refreshTokens.mockResolvedValue({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        expires_in: 3600
      })

      const mockRequest = {
        yar: mockYar,
        query: {},
        headers: {},
        route: { settings: { auth: { mode: 'required' } } }
      }

      await scheme.authenticate(mockRequest, mockAuthResponse)

      expect(refreshTokens).toHaveBeenCalledWith(
        'valid-refresh-token',
        undefined
      )
    })
  })

  describe('Expired token with refresh failure', () => {
    test('Should redirect to login when refresh fails and mode is required', async () => {
      const scheme = yarSessionScheme()
      const pastDate = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const sessionData = {
        contactId: '123',
        email: 'test@example.com',
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token',
        expiresAt: pastDate
      }
      mockYar.get.mockReturnValue(sessionData)

      refreshTokens.mockRejectedValue(new Error('Token refresh failed'))

      const mockRequest = {
        yar: mockYar,
        query: {},
        path: '/dashboard',
        headers: {},
        route: { settings: { auth: { mode: 'required' } } }
      }

      const result = await scheme.authenticate(mockRequest, mockAuthResponse)

      expect(mockYar.clear).toHaveBeenCalledWith('auth')
      expect(saveRedirectPath).toHaveBeenCalledWith(mockRequest, '/dashboard')
      expect(mockAuthResponse.redirect).toHaveBeenCalledWith('/auth/login')
      expect(result).toBe('redirect')
    })

    test('Should allow access with empty credentials when refresh fails and mode is try', async () => {
      const scheme = yarSessionScheme()
      const pastDate = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const sessionData = {
        contactId: '123',
        email: 'test@example.com',
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token',
        expiresAt: pastDate
      }
      mockYar.get.mockReturnValue(sessionData)

      refreshTokens.mockRejectedValue(new Error('Token refresh failed'))

      const mockRequest = {
        yar: mockYar,
        query: {},
        headers: {},
        route: { settings: { auth: { mode: 'try' } } }
      }

      const result = await scheme.authenticate(mockRequest, mockAuthResponse)

      expect(mockYar.clear).toHaveBeenCalledWith('auth')
      expect(mockAuthResponse.authenticated).toHaveBeenCalledWith({
        credentials: {}
      })
      expect(result).toEqual({ credentials: {} })
    })

    test('Should allow access with empty credentials when refresh fails and mode is optional', async () => {
      const scheme = yarSessionScheme()
      const pastDate = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const sessionData = {
        contactId: '123',
        email: 'test@example.com',
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token',
        expiresAt: pastDate
      }
      mockYar.get.mockReturnValue(sessionData)

      refreshTokens.mockRejectedValue(new Error('Token refresh failed'))

      const mockRequest = {
        yar: mockYar,
        query: {},
        headers: {},
        route: { settings: { auth: { mode: 'optional' } } }
      }

      const result = await scheme.authenticate(mockRequest, mockAuthResponse)

      expect(mockYar.clear).toHaveBeenCalledWith('auth')
      expect(mockAuthResponse.authenticated).toHaveBeenCalledWith({
        credentials: {}
      })
      expect(result).toEqual({ credentials: {} })
    })
  })

  describe('login_hint preservation in redirects', () => {
    test('Should preserve login_hint when redirecting from no session', async () => {
      const scheme = yarSessionScheme()
      mockYar.get.mockReturnValue(null)

      const mockRequest = {
        yar: mockYar,
        query: { login_hint: 'user@example.com' },
        path: '/dashboard',
        route: { settings: { auth: { mode: 'required' } } }
      }

      await scheme.authenticate(mockRequest, mockAuthResponse)

      expect(mockAuthResponse.redirect).toHaveBeenCalledWith(
        '/auth/login?login_hint=user%40example.com'
      )
    })

    test('Should preserve login_hint when redirecting from failed refresh', async () => {
      const scheme = yarSessionScheme()
      const pastDate = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const sessionData = {
        accessToken: 'expired',
        refreshToken: 'invalid',
        expiresAt: pastDate
      }
      mockYar.get.mockReturnValue(sessionData)
      refreshTokens.mockRejectedValue(new Error('Failed'))

      const mockRequest = {
        yar: mockYar,
        query: { login_hint: 'user@example.com' },
        path: '/dashboard',
        headers: {},
        route: { settings: { auth: { mode: 'required' } } }
      }

      await scheme.authenticate(mockRequest, mockAuthResponse)

      expect(mockAuthResponse.redirect).toHaveBeenCalledWith(
        '/auth/login?login_hint=user%40example.com'
      )
    })
  })
})
