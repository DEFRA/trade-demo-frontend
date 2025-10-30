import { describe, expect, test, beforeEach, vi } from 'vitest'
import {
  createDashboardController,
  getFakeSessionValue,
  getFakeOidcEndpoints
} from './controller.js'

describe('Dashboard Controller', () => {
  let mockRequest
  let mockH
  let controller

  beforeEach(() => {
    mockRequest = {}
    mockH = {
      view: vi.fn()
    }
    // Inject both fake functions from controller
    controller = createDashboardController(
      getFakeSessionValue,
      getFakeOidcEndpoints
    )
  })

  test('Should render dashboard view with user data', async () => {
    await controller.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith(
      'dashboard/index',
      expect.objectContaining({
        pageTitle: 'Dashboard',
        heading: 'Trade Imports Dashboard',
        user: {
          displayName: 'Importer H Coded',
          email: 'hard@coded.com',
          contactId: '00000000000'
        }
      })
    )
  })

  test('Should show imports link flag', async () => {
    await controller.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith(
      'dashboard/index',
      expect.objectContaining({
        showImportsLink: true
      })
    )
  })

  test('Should call view with correct template name', async () => {
    await controller.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith(
      'dashboard/index',
      expect.any(Object)
    )
  })

  test('Should pass OIDC endpoints to view when fetch succeeds', async () => {
    await controller.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith(
      'dashboard/index',
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

    const testController = createDashboardController(
      getFakeSessionValue,
      mockGetOidcEndpoints
    )

    await testController.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalledWith(
      'dashboard/index',
      expect.objectContaining({
        oidcEndpoints: null,
        oidcError: 'OIDC discovery failed'
      })
    )
  })
})
