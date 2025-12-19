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

  describe('findAll', () => {
    test('should call GET /notifications', async () => {
      const mockNotifications = [
        {
          id: '1',
          chedReference: 'CHED-001',
          status: 'SUBMITTED',
          originCountry: 'United Kingdom'
        },
        {
          id: '2',
          chedReference: 'CHED-002',
          status: 'DRAFT',
          originCountry: 'Ireland'
        }
      ]

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockNotifications)
      }

      fetch.mockResolvedValue(mockResponse)

      const result = await notificationApi.findAll(mockTraceId)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/notifications'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'x-cdp-request-id': mockTraceId
          })
        })
      )
      expect(result).toEqual(mockNotifications)
    })

    test('should include trace ID in request header', async () => {
      const customTraceId = 'custom-trace-123'
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([])
      }

      fetch.mockResolvedValue(mockResponse)

      await notificationApi.findAll(customTraceId)

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-cdp-request-id': customTraceId
          })
        })
      )
    })

    test('should return empty array when no notifications found', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([])
      }

      fetch.mockResolvedValue(mockResponse)

      const result = await notificationApi.findAll(mockTraceId)

      expect(result).toEqual([])
    })

    test('should throw error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      }

      fetch.mockResolvedValue(mockResponse)

      await expect(notificationApi.findAll(mockTraceId)).rejects.toThrow(
        'Backend API error: 500 Internal Server Error'
      )
    })

    test('should throw error when response is 404', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      }

      fetch.mockResolvedValue(mockResponse)

      await expect(notificationApi.findAll(mockTraceId)).rejects.toThrow(
        'Backend API error: 404 Not Found'
      )
    })

    test('should handle network errors', async () => {
      const networkError = new Error('Network connection failed')
      fetch.mockRejectedValue(networkError)

      await expect(notificationApi.findAll(mockTraceId)).rejects.toThrow(
        'Network connection failed'
      )
    })
  })
})
