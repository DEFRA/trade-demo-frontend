import { describe, expect, test, beforeEach, vi, afterEach } from 'vitest'
import { dashboardController } from './controller.js'
import { notificationApi } from '../common/helpers/api-client.js'
import { buildDashboardViewModel } from './helpers/view-models.js'
import { config } from '../../config/config.js'

// Mock dependencies
vi.mock('../common/helpers/api-client.js', () => ({
  notificationApi: {
    findAll: vi.fn()
  }
}))

vi.mock('./helpers/view-models.js', () => ({
  buildDashboardViewModel: vi.fn()
}))

vi.mock('../../config/config.js', () => ({
  config: {
    get: vi.fn()
  }
}))

describe('Dashboard Controller', () => {
  let mockRequest
  let mockH
  let mockNotifications
  let mockViewModel

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()

    // Mock request with headers and logger
    mockRequest = {
      headers: {
        'x-cdp-request-id': 'test-trace-id-123'
      },
      logger: {
        error: vi.fn()
      }
    }

    // Mock Hapi response toolkit
    mockH = {
      view: vi.fn().mockReturnValue('rendered-view')
    }

    // Mock notifications data
    mockNotifications = [
      {
        id: '1',
        chedReference: 'CHED-001',
        status: 'SUBMITTED',
        originCountry: 'United Kingdom',
        commodity: { description: 'Live bovine animals' },
        transport: { bcpCode: 'GBLHR1' },
        created: '2025-12-16T10:00:00Z'
      },
      {
        id: '2',
        chedReference: 'CHED-002',
        status: 'DRAFT',
        originCountry: 'Ireland',
        commodity: { description: 'Live sheep' },
        transport: { bcpCode: 'GBLHR2' },
        created: '2025-12-15T10:00:00Z'
      }
    ]

    // Mock view model
    mockViewModel = {
      pageTitle: 'Dashboard',
      heading: 'Trade Imports Dashboard',
      hasNotifications: true,
      notifications: mockNotifications,
      displayedNotifications: 2
    }

    // Default config mock
    config.get.mockReturnValue(10)

    // Default API mock
    notificationApi.findAll.mockResolvedValue(mockNotifications)

    // Default view model builder mock
    buildDashboardViewModel.mockReturnValue(mockViewModel)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful notification fetching', () => {
    test('Should fetch all notifications with trace ID from headers', async () => {
      await dashboardController.handler(mockRequest, mockH)

      expect(notificationApi.findAll).toHaveBeenCalledWith('test-trace-id-123')
    })

    test('Should use default trace ID when header is missing', async () => {
      mockRequest.headers = {}

      await dashboardController.handler(mockRequest, mockH)

      expect(notificationApi.findAll).toHaveBeenCalledWith('no-trace-id')
    })

    test('Should get limit from config', async () => {
      config.get.mockReturnValue(5)

      await dashboardController.handler(mockRequest, mockH)

      expect(config.get).toHaveBeenCalledWith('dashboardRecordsLimit')
    })

    test('Should build view model from fetched notifications', async () => {
      await dashboardController.handler(mockRequest, mockH)

      expect(buildDashboardViewModel).toHaveBeenCalledWith(mockNotifications)
    })

    test('Should render dashboard view with view model', async () => {
      await dashboardController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('dashboard/index', mockViewModel)
    })

    test('Should return rendered view', async () => {
      const result = await dashboardController.handler(mockRequest, mockH)

      expect(result).toBe('rendered-view')
    })

    test('Should work with empty notifications array', async () => {
      const emptyViewModel = {
        pageTitle: 'Dashboard',
        heading: 'Trade Imports Dashboard',
        hasNotifications: false,
        notifications: [],
        displayedNotifications: 0
      }

      notificationApi.findAll.mockResolvedValue([])
      buildDashboardViewModel.mockReturnValue(emptyViewModel)

      await dashboardController.handler(mockRequest, mockH)

      expect(buildDashboardViewModel).toHaveBeenCalledWith([])
      expect(mockH.view).toHaveBeenCalledWith('dashboard/index', emptyViewModel)
    })

    test('Should sort notifications by created date descending (newest first)', async () => {
      const unsortedNotifications = [
        { id: '1', created: '2025-12-15T10:00:00Z' }, // Oldest
        { id: '2', created: '2025-12-17T10:00:00Z' }, // Newest
        { id: '3', created: '2025-12-16T10:00:00Z' } // Middle
      ]

      notificationApi.findAll.mockResolvedValue(unsortedNotifications)

      await dashboardController.handler(mockRequest, mockH)

      // Verify buildDashboardViewModel was called with sorted notifications
      const callArg = buildDashboardViewModel.mock.calls[0][0]
      expect(callArg[0].id).toBe('2') // Newest first
      expect(callArg[1].id).toBe('3')
      expect(callArg[2].id).toBe('1') // Oldest last
    })

    test('Should limit notifications to configured limit', async () => {
      const manyNotifications = Array.from({ length: 20 }, (_, i) => ({
        id: `id-${i}`,
        created: `2025-12-${String(i + 1).padStart(2, '0')}T10:00:00Z`
      }))

      config.get.mockReturnValue(5)
      notificationApi.findAll.mockResolvedValue(manyNotifications)

      await dashboardController.handler(mockRequest, mockH)

      // Verify only 5 notifications were passed to view model builder
      const callArg = buildDashboardViewModel.mock.calls[0][0]
      expect(callArg).toHaveLength(5)
    })

    test('Should return all notifications when count is less than limit', async () => {
      const fewNotifications = [
        { id: '1', created: '2025-12-15T10:00:00Z' },
        { id: '2', created: '2025-12-16T10:00:00Z' }
      ]

      config.get.mockReturnValue(10)
      notificationApi.findAll.mockResolvedValue(fewNotifications)

      await dashboardController.handler(mockRequest, mockH)

      // Verify all notifications were passed to view model builder
      const callArg = buildDashboardViewModel.mock.calls[0][0]
      expect(callArg).toHaveLength(2)
    })
  })

  describe('Error handling', () => {
    test('Should handle API error gracefully', async () => {
      const apiError = new Error('API connection failed')
      notificationApi.findAll.mockRejectedValue(apiError)

      const emptyViewModel = {
        pageTitle: 'Dashboard',
        heading: 'Trade Imports Dashboard',
        hasNotifications: false,
        notifications: [],
        displayedNotifications: 0
      }
      buildDashboardViewModel.mockReturnValue(emptyViewModel)

      await dashboardController.handler(mockRequest, mockH)

      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        'Failed to fetch notifications for dashboard:',
        apiError
      )
      expect(buildDashboardViewModel).toHaveBeenCalledWith([])
      expect(mockH.view).toHaveBeenCalledWith('dashboard/index', emptyViewModel)
    })

    test('Should render empty state when API times out', async () => {
      const timeoutError = new Error('Request timeout')
      notificationApi.findAll.mockRejectedValue(timeoutError)

      const emptyViewModel = {
        pageTitle: 'Dashboard',
        heading: 'Trade Imports Dashboard',
        hasNotifications: false,
        notifications: [],
        displayedNotifications: 0
      }
      buildDashboardViewModel.mockReturnValue(emptyViewModel)

      const result = await dashboardController.handler(mockRequest, mockH)

      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        'Failed to fetch notifications for dashboard:',
        timeoutError
      )
      expect(result).toBe('rendered-view')
    })

    test('Should render empty state when API returns 404', async () => {
      const notFoundError = new Error('Not found')
      notificationApi.findAll.mockRejectedValue(notFoundError)

      const emptyViewModel = {
        pageTitle: 'Dashboard',
        heading: 'Trade Imports Dashboard',
        hasNotifications: false,
        notifications: [],
        displayedNotifications: 0
      }
      buildDashboardViewModel.mockReturnValue(emptyViewModel)

      await dashboardController.handler(mockRequest, mockH)

      expect(buildDashboardViewModel).toHaveBeenCalledWith([])
      expect(mockH.view).toHaveBeenCalledWith('dashboard/index', emptyViewModel)
    })

    test('Should render empty state when API returns 500', async () => {
      const serverError = new Error('Internal server error')
      notificationApi.findAll.mockRejectedValue(serverError)

      const emptyViewModel = {
        pageTitle: 'Dashboard',
        heading: 'Trade Imports Dashboard',
        hasNotifications: false,
        notifications: [],
        displayedNotifications: 0
      }
      buildDashboardViewModel.mockReturnValue(emptyViewModel)

      await dashboardController.handler(mockRequest, mockH)

      expect(mockRequest.logger.error).toHaveBeenCalled()
      expect(buildDashboardViewModel).toHaveBeenCalledWith([])
    })

    test('Should not throw error when backend is down', async () => {
      notificationApi.findAll.mockRejectedValue(
        new Error('Backend unavailable')
      )

      const emptyViewModel = {
        pageTitle: 'Dashboard',
        heading: 'Trade Imports Dashboard',
        hasNotifications: false,
        notifications: [],
        displayedNotifications: 0
      }
      buildDashboardViewModel.mockReturnValue(emptyViewModel)

      await expect(
        dashboardController.handler(mockRequest, mockH)
      ).resolves.not.toThrow()
    })
  })
})
