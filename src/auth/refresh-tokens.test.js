import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mockOidcEndpoints } from '../../test/helpers/setup-mocks.js'

// Mock fetch globally
global.fetch = vi.fn()

// Token refresh response fixtures
const mockTokenRefreshResponse = {
  access_token: 'new-mock-access-token',
  refresh_token: 'new-mock-refresh-token',
  token_type: 'Bearer',
  expires_in: 3600, // 1 hour
  id_token: 'mock-id-token-jwt'
}

const mockTokenErrorResponse = {
  error: 'invalid_grant',
  error_description: 'The refresh token is invalid or expired'
}

describe('Token Refresh', () => {
  let refreshTokens

  beforeEach(async () => {
    // Reset modules to clear any caches
    vi.resetModules()
    global.fetch.mockClear()

    // Mock getOidcEndpoints to avoid network calls
    vi.doMock('./oidc-well-known-discovery.js', () => ({
      getOidcEndpoints: vi.fn().mockResolvedValue(mockOidcEndpoints)
    }))

    // Import after mocking
    const module = await import('./refresh-tokens.js')
    refreshTokens = module.refreshTokens
  })

  test('Should successfully refresh tokens', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTokenRefreshResponse
    })

    const result = await refreshTokens('old-refresh-token', 'trace-123')

    expect(result).toEqual(mockTokenRefreshResponse)
    expect(result.access_token).toBe('new-mock-access-token')
    expect(result.refresh_token).toBe('new-mock-refresh-token')
    expect(result.expires_in).toBe(3600)
  })

  test('Should POST to token endpoint with correct parameters', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTokenRefreshResponse
    })

    await refreshTokens('test-refresh-token', 'trace-123')

    expect(global.fetch).toHaveBeenCalledWith(
      mockOidcEndpoints.token_endpoint,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded'
        })
      })
    )

    // Verify POST body contains required OAuth2 parameters
    const callArgs = global.fetch.mock.calls[0]
    const body = callArgs[1].body
    expect(body).toContain('grant_type=refresh_token')
    expect(body).toContain('refresh_token=test-refresh-token')
    expect(body).toContain('client_id=')
    expect(body).toContain('client_secret=')
  })

  test('Should include trace ID header when provided', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTokenRefreshResponse
    })

    await refreshTokens('test-refresh-token', 'trace-abc-123')

    const callArgs = global.fetch.mock.calls[0]
    const headers = callArgs[1].headers

    expect(headers['x-cdp-request-id']).toBe('trace-abc-123')
  })

  test('Should not include trace ID header when not provided', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTokenRefreshResponse
    })

    await refreshTokens('test-refresh-token')

    const callArgs = global.fetch.mock.calls[0]
    const headers = callArgs[1].headers

    expect(headers['x-cdp-request-id']).toBeUndefined()
  })

  test('Should throw error on HTTP error response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => JSON.stringify(mockTokenErrorResponse)
    })

    await expect(
      refreshTokens('invalid-refresh-token', 'trace-123')
    ).rejects.toThrow('Token refresh failed: 400 Bad Request')
  })

  test('Should include error response body in error message', async () => {
    const errorBody = JSON.stringify(mockTokenErrorResponse)

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => errorBody
    })

    await expect(
      refreshTokens('invalid-refresh-token', 'trace-123')
    ).rejects.toThrow(errorBody)
  })

  test('Should throw error on network failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    await expect(
      refreshTokens('test-refresh-token', 'trace-123')
    ).rejects.toThrow('Network error')
  })

  test('Should throw error when token endpoint is unreachable', async () => {
    global.fetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    await expect(
      refreshTokens('test-refresh-token', 'trace-123')
    ).rejects.toThrow('ECONNREFUSED')
  })
})
