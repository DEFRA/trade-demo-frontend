import { describe, expect, test, beforeEach, vi } from 'vitest'
import {
  createAccountController,
  getFakeSessionValue,
  getFakeOidcEndpoints
} from './controller.js'

describe('Account Controller', () => {
  let mockRequest
  let mockViewRenderer
  let controller

  beforeEach(() => {
    mockRequest = {}
    mockViewRenderer = {
      view: vi.fn()
    }
    // Inject both fake functions from controller
    controller = createAccountController(
      getFakeSessionValue,
      getFakeOidcEndpoints
    )
  })

  test('Should render account view with user data', async () => {
    await controller.handler(mockRequest, mockViewRenderer)

    expect(mockViewRenderer.view).toHaveBeenCalledWith(
      'account/index',
      expect.objectContaining({
        pageTitle: 'Your account',
        heading: 'Your account',
        user: expect.objectContaining({
          displayName: 'Importer H Coded',
          email: 'hard@coded.com',
          contactId: '00000000000'
        })
      })
    )
  })

  test('Should call view with correct template name', async () => {
    await controller.handler(mockRequest, mockViewRenderer)

    expect(mockViewRenderer.view).toHaveBeenCalledWith(
      'account/index',
      expect.any(Object)
    )
  })

  test('Should pass OIDC endpoints to view when fetch succeeds', async () => {
    await controller.handler(mockRequest, mockViewRenderer)

    expect(mockViewRenderer.view).toHaveBeenCalledWith(
      'account/index',
      expect.objectContaining({
        oidcEndpoints: {
          authorization_endpoint: 'https://fake-auth-server/authorize',
          token_endpoint: 'https://fake-auth-server/token',
          end_session_endpoint: 'https://fake-auth-server/logout',
          jwks_uri: 'https://fake-auth-server/jwks',
          issuer: 'https://fake-auth-server'
        },
        oidcError: null
      })
    )
  })

  test('Should handle OIDC fetch error gracefully', async () => {
    const mockGetOidcEndpoints = vi
      .fn()
      .mockRejectedValue(new Error('OIDC discovery failed'))

    const testController = createAccountController(
      getFakeSessionValue,
      mockGetOidcEndpoints
    )

    await testController.handler(mockRequest, mockViewRenderer)

    expect(mockViewRenderer.view).toHaveBeenCalledWith(
      'account/index',
      expect.objectContaining({
        oidcEndpoints: null,
        oidcError: 'OIDC discovery failed'
      })
    )
  })

  test('Should format session expiration date when present', async () => {
    const mockGetSession = vi.fn().mockResolvedValue({
      displayName: 'Test User',
      email: 'test@example.com',
      contactId: '123',
      expiresAt: '2025-12-31T23:59:59Z'
    })

    const testController = createAccountController(
      mockGetSession,
      getFakeOidcEndpoints
    )

    await testController.handler(mockRequest, mockViewRenderer)

    expect(mockViewRenderer.view).toHaveBeenCalledWith(
      'account/index',
      expect.objectContaining({
        user: expect.objectContaining({
          expiresAt: expect.stringContaining('December')
        })
      })
    )
  })

  test('Should handle missing user data gracefully', async () => {
    const mockGetSession = vi.fn().mockResolvedValue(null)

    const testController = createAccountController(
      mockGetSession,
      getFakeOidcEndpoints
    )

    await testController.handler(mockRequest, mockViewRenderer)

    expect(mockViewRenderer.view).toHaveBeenCalledWith(
      'account/index',
      expect.objectContaining({
        user: {
          displayName: undefined,
          email: undefined,
          contactId: undefined,
          roles: undefined,
          relationships: undefined,
          aal: undefined,
          loa: undefined,
          expiresAt: null
        }
      })
    )
  })
})
