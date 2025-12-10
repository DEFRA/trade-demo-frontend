import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { notificationApi } from './api-client.js'
import fetch from 'node-fetch'

vi.mock('node-fetch')

describe('notificationApi', () => {
  const mockTraceId = 'test-trace-id'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('saveDraft', () => {
    test('should call PUT /notifications with NotificationDto', async () => {
      const notificationDto = {
        id: '123',
        originCountry: 'FR',
        importReason: 'commercial'
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: '123', status: 'DRAFT' })
      }

      fetch.mockResolvedValue(mockResponse)

      const result = await notificationApi.saveDraft(
        notificationDto,
        mockTraceId
      )

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/notifications'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-cdp-request-id': mockTraceId
          }),
          body: JSON.stringify(notificationDto)
        })
      )
      expect(result).toEqual({ id: '123', status: 'DRAFT' })
    })

    test('should throw error when response is not ok', async () => {
      const notificationDto = { id: '123' }
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      }

      fetch.mockResolvedValue(mockResponse)

      await expect(
        notificationApi.saveDraft(notificationDto, mockTraceId)
      ).rejects.toThrow('Backend API error: 500 Internal Server Error')
    })
  })

  describe('submitNotification', () => {
    test('should call POST /notifications/submit with NotificationDto', async () => {
      const notificationDto = {
        id: '123',
        originCountry: 'FR',
        importReason: 'commercial'
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: '123', status: 'SUBMITTED' })
      }

      fetch.mockResolvedValue(mockResponse)

      const result = await notificationApi.submitNotification(
        notificationDto,
        mockTraceId
      )

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/submit'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-cdp-request-id': mockTraceId
          }),
          body: JSON.stringify(notificationDto)
        })
      )
      expect(result).toEqual({ id: '123', status: 'SUBMITTED' })
    })

    test('should throw error when response is not ok', async () => {
      const notificationDto = { id: '123' }
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      }

      fetch.mockResolvedValue(mockResponse)

      await expect(
        notificationApi.submitNotification(notificationDto, mockTraceId)
      ).rejects.toThrow('Backend API error: 400 Bad Request')
    })
  })
})
