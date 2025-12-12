import { describe, test, expect, vi, beforeEach } from 'vitest'
import { reviewController } from './review.js'
import * as sessionHelpers from '../../common/helpers/session-helpers.js'
import { statusCodes } from '../../common/constants/status-codes.js'

// Mock dependencies
vi.mock('../../common/helpers/session-helpers.js')
vi.mock('../../common/helpers/api-client.js')

describe('reviewController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      payload: {
        confirmAccurate: 'true'
      },
      headers: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      },
      yar: {
        get: vi.fn(),
        set: vi.fn()
      }
    }

    mockH = {
      view: vi.fn().mockReturnThis(),
      redirect: vi.fn(),
      code: vi.fn().mockReturnThis()
    }

    // Default session values
    sessionHelpers.getSessionValue.mockImplementation((req, key) => {
      if (key === 'origin-country') return 'FR'
      if (key === 'purpose') return 'commercial'
      if (key === 'isCommodityCodeFlowComplete') return null // Simulating the bug condition (missing/null)
      return null
    })
  })

  test('Should show correct error message when isCommodityCodeFlowComplete is missing/null', async () => {
    // When isCommodityCodeFlowComplete is null (returned from session),
    // it should be cast to boolean false and trigger 'Complete commodity codes flow' error.
    // If it is NOT cast, it would trigger 'must be a boolean'.

    await reviewController.post.handler(mockRequest, mockH)

    expect(mockH.view).toHaveBeenCalled()
    const viewModel = mockH.view.mock.calls[0][1]

    // We expect validation failure
    expect(mockH.code).toHaveBeenCalledWith(statusCodes.badRequest)

    // Check error messages
    const errorText = viewModel.errorList[0].text
    expect(errorText).toBe('Complete commodity codes flow')
    expect(errorText).not.toBe(
      '"isCommodityCodeFlowComplete" must be a boolean'
    )
  })

  test('Should accept "true" string from session', async () => {
    sessionHelpers.getSessionValue.mockImplementation((req, key) => {
      if (key === 'origin-country') return 'FR'
      if (key === 'purpose') return 'commercial'
      if (key === 'isCommodityCodeFlowComplete') return 'true'
      return null
    })

    // We mock the API to avoid errors further down
    const { notificationApi } = await import(
      '../../common/helpers/api-client.js'
    )
    notificationApi.submitNotification = vi
      .fn()
      .mockResolvedValue({ id: '123' })

    await reviewController.post.handler(mockRequest, mockH)

    // Should succeed and redirect
    expect(mockH.redirect).toHaveBeenCalledWith('/import/confirmation')
  })

  test('Should call submitNotification (not saveDraft) when submitting', async () => {
    sessionHelpers.getSessionValue.mockImplementation((req, key) => {
      if (key === 'origin-country') return 'FR'
      if (key === 'purpose') return 'commercial'
      if (key === 'isCommodityCodeFlowComplete') return true
      return null
    })

    // Mock the API
    const { notificationApi } = await import(
      '../../common/helpers/api-client.js'
    )
    notificationApi.submitNotification = vi
      .fn()
      .mockResolvedValue({ id: '123', status: 'SUBMITTED' })
    notificationApi.saveDraft = vi
      .fn()
      .mockResolvedValue({ id: '123', status: 'DRAFT' })

    await reviewController.post.handler(mockRequest, mockH)

    // Should call submitNotification, NOT saveDraft
    expect(notificationApi.submitNotification).toHaveBeenCalledTimes(1)
    expect(notificationApi.saveDraft).not.toHaveBeenCalled()
    expect(mockH.redirect).toHaveBeenCalledWith('/import/confirmation')
  })
})
