import { describe, test, expect, vi, beforeEach } from 'vitest'
import { consignmentOriginController } from './consignment-origin.js'
import * as sessionHelpers from '../../common/helpers/session-helpers.js'
import { statusCodes } from '../../common/constants/status-codes.js'

// Mock session helpers
vi.mock('../../common/helpers/session-helpers.js')

describe('consignmentOriginController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Mock request object
    mockRequest = {
      payload: {},
      yar: {
        get: vi.fn(),
        set: vi.fn()
      }
    }

    // Mock h (response toolkit)
    mockH = {
      view: vi.fn().mockReturnThis(),
      redirect: vi.fn(),
      code: vi.fn().mockReturnThis()
    }
  })

  describe('GET handler', () => {
    test('Should render origin page with empty country when no session data', () => {
      sessionHelpers.getSessionValue.mockReturnValue(null)

      consignmentOriginController.get.handler(mockRequest, mockH)

      expect(sessionHelpers.getSessionValue).toHaveBeenCalledWith(
        mockRequest,
        'origin-country'
      )
      expect(mockH.view).toHaveBeenCalledWith(
        'import/templates/consignment-origin/index',
        expect.objectContaining({
          pageTitle: 'Select the country where the animal originates from',
          heading: 'Select the country where the animal originates from',
          originCountry: ''
        })
      )
    })

    test('Should render origin page with existing country from session', () => {
      sessionHelpers.getSessionValue.mockReturnValue('FR')

      consignmentOriginController.get.handler(mockRequest, mockH)

      expect(sessionHelpers.getSessionValue).toHaveBeenCalledWith(
        mockRequest,
        'origin-country'
      )
      expect(mockH.view).toHaveBeenCalledWith(
        'import/templates/consignment-origin/index',
        expect.objectContaining({
          originCountry: 'FR'
        })
      )
    })

    test('Should call view with correct template path', () => {
      sessionHelpers.getSessionValue.mockReturnValue(null)

      consignmentOriginController.get.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledTimes(1)
      const templatePath = mockH.view.mock.calls[0][0]
      expect(templatePath).toBe('import/templates/consignment-origin/index')
    })
  })

  describe('POST handler', () => {
    test('Should save valid country and redirect to purpose screen', () => {
      mockRequest.payload = { 'origin-country': 'FR' }

      consignmentOriginController.post.handler(mockRequest, mockH)

      expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
        mockRequest,
        'origin-country',
        'FR'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/import/commodity/codes')
    })

    test('Should trim whitespace from country code', () => {
      mockRequest.payload = { 'origin-country': '  FR  ' }

      consignmentOriginController.post.handler(mockRequest, mockH)

      expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
        mockRequest,
        'origin-country',
        'FR'
      )
    })

    test('Should show error when country is empty', () => {
      mockRequest.payload = { 'origin-country': '' }

      consignmentOriginController.post.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalled()
      expect(mockH.code).toHaveBeenCalledWith(statusCodes.badRequest)

      const viewModel = mockH.view.mock.calls[0][1]
      expect(viewModel.errorList).toBeDefined()
      expect(viewModel.errorList[0].text).toContain('Select the country')
      expect(viewModel.formError).toBeDefined()
      expect(viewModel.formError.text).toContain('Select the country')
    })

    test('Should not save to session when validation fails', () => {
      mockRequest.payload = { 'origin-country': '' }

      consignmentOriginController.post.handler(mockRequest, mockH)

      expect(sessionHelpers.setSessionValue).not.toHaveBeenCalled()
    })

    test('Should preserve entered value on validation error', () => {
      mockRequest.payload = { 'origin-country': '' }

      consignmentOriginController.post.handler(mockRequest, mockH)

      const viewModel = mockH.view.mock.calls[0][1]
      expect(viewModel.originCountry).toBe('')
    })

    test('Should return correct status code and call code() for validation errors', () => {
      mockRequest.payload = { 'origin-country': '' }

      consignmentOriginController.post.handler(mockRequest, mockH)

      expect(mockH.code).toHaveBeenCalledWith(statusCodes.badRequest)
      expect(mockH.code).toHaveBeenCalledTimes(1)
    })

    test('Should handle multiple validation errors if schema changes', () => {
      // This test ensures the error formatting works with multiple errors
      mockRequest.payload = {}

      consignmentOriginController.post.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalled()
      const viewModel = mockH.view.mock.calls[0][1]
      expect(viewModel.errorList).toBeDefined()
      expect(Array.isArray(viewModel.errorList)).toBe(true)
    })
  })

  describe('Controller structure', () => {
    test('Should export controller with get and post handlers', () => {
      expect(consignmentOriginController).toBeDefined()
      expect(consignmentOriginController.get).toBeDefined()
      expect(consignmentOriginController.post).toBeDefined()
      expect(typeof consignmentOriginController.get.handler).toBe('function')
      expect(typeof consignmentOriginController.post.handler).toBe('function')
    })
  })
})
