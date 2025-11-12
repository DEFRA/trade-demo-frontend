import { describe, expect, test, beforeEach, vi } from 'vitest'
import { dashboardController } from './controller.js'

describe('Dashboard Controller', () => {
  let mockRequest
  let mockViewRenderer

  beforeEach(() => {
    mockRequest = {}
    mockViewRenderer = {
      view: vi.fn()
    }
  })

  test('Should render dashboard view with correct data', async () => {
    await dashboardController.handler(mockRequest, mockViewRenderer)

    expect(mockViewRenderer.view).toHaveBeenCalledWith('dashboard/index', {
      pageTitle: 'Dashboard',
      heading: 'Trade Imports Dashboard'
    })
  })

  test('Should call view with correct template name', async () => {
    await dashboardController.handler(mockRequest, mockViewRenderer)

    expect(mockViewRenderer.view).toHaveBeenCalledWith(
      'dashboard/index',
      expect.any(Object)
    )
  })
})
