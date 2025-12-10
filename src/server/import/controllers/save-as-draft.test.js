import { describe, test, expect, vi, beforeEach } from 'vitest'
import { saveAsDraftController } from './save-as-draft.js'

// Mock dependencies
vi.mock('../../common/helpers/session-helpers.js')
vi.mock('../../common/helpers/api-client.js')
vi.mock('../helpers/notification-builder.js')

describe('saveAsDraftController', () => {
  let mockRequest
  let mockH

  beforeEach(async () => {
    vi.clearAllMocks()

    mockRequest = {
      payload: {
        formData: {
          'origin-country': 'FR',
          purpose: 'commercial'
        }
      },
      headers: {
        'x-cdp-request-id': 'test-trace-id'
      },
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      }
    }

    mockH = {
      response: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnThis()
    }
  })

  test('should call buildNotificationDto without status parameter', async () => {
    const { getSessionValue, setSessionValue } = await import(
      '../../common/helpers/session-helpers.js'
    )
    const { notificationApi } = await import(
      '../../common/helpers/api-client.js'
    )
    const { buildNotificationDto, hasNotificationData } = await import(
      '../helpers/notification-builder.js'
    )

    getSessionValue.mockReturnValue(null)
    setSessionValue.mockReturnValue(undefined)

    const mockNotificationDto = {
      id: null,
      originCountry: 'FR',
      importReason: 'commercial'
    }

    buildNotificationDto.mockReturnValue(mockNotificationDto)
    hasNotificationData.mockReturnValue(true)
    notificationApi.saveDraft.mockResolvedValue({ id: '123' })

    await saveAsDraftController.post.handler(mockRequest, mockH)

    // Should call buildNotificationDto with sessionData only (no status parameter)
    expect(buildNotificationDto).toHaveBeenCalledWith(
      expect.objectContaining({
        'notification-id': null,
        'origin-country': null
      })
    )
    expect(buildNotificationDto).toHaveBeenCalledTimes(1)
    // Verify it was NOT called with a second parameter
    expect(buildNotificationDto.mock.calls[0]).toHaveLength(1)
  })

  test('should call saveDraft API with notification DTO', async () => {
    const { getSessionValue, setSessionValue } = await import(
      '../../common/helpers/session-helpers.js'
    )
    const { notificationApi } = await import(
      '../../common/helpers/api-client.js'
    )
    const { buildNotificationDto, hasNotificationData } = await import(
      '../helpers/notification-builder.js'
    )

    getSessionValue.mockReturnValue('FR')
    setSessionValue.mockReturnValue(undefined)

    const mockNotificationDto = {
      id: null,
      originCountry: 'FR'
    }

    buildNotificationDto.mockReturnValue(mockNotificationDto)
    hasNotificationData.mockReturnValue(true)
    notificationApi.saveDraft.mockResolvedValue({ id: '456' })

    await saveAsDraftController.post.handler(mockRequest, mockH)

    expect(notificationApi.saveDraft).toHaveBeenCalledWith(
      mockNotificationDto,
      'test-trace-id'
    )
    expect(mockH.response).toHaveBeenCalledWith({
      success: true,
      message: 'Draft saved successfully',
      notificationId: '456'
    })
  })
})
