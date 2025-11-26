import { describe, test, expect, vi, beforeEach } from 'vitest'
import { consignmentPurposeController } from './consignment-purpose.js'
import * as sessionHelpers from '../../common/helpers/session-helpers.js'
import { statusCodes } from '../../common/constants/status-codes.js'

// Mock session helpers
vi.mock('../../common/helpers/session-helpers.js')

describe('consignmentPurposeController', () => {
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
    test('Should redirect to origin when no origin-country in session (guard)', () => {
      sessionHelpers.getSessionValue.mockReturnValue(null)

      consignmentPurposeController.get.handler(mockRequest, mockH)

      expect(sessionHelpers.getSessionValue).toHaveBeenCalledWith(
        mockRequest,
        'origin-country'
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/import/consignment/origin')
    })

    test('Should render purpose page when origin-country exists in session', () => {
      sessionHelpers.getSessionValue
        .mockReturnValueOnce('FR') // origin-country
        .mockReturnValueOnce(null) // purpose
        .mockReturnValueOnce(null) // internal-market-purpose

      consignmentPurposeController.get.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'import/templates/consignment-purpose/index',
        expect.objectContaining({
          pageTitle: 'What is the main reason for importing the animals?',
          heading: 'What is the main reason for importing the animals?',
          purpose: '',
          internalMarketPurpose: ''
        })
      )
    })

    test('Should render purpose page with existing purpose from session', () => {
      sessionHelpers.getSessionValue
        .mockReturnValueOnce('FR') // origin-country
        .mockReturnValueOnce('internalmarket') // purpose
        .mockReturnValueOnce('breeding') // internal-market-purpose

      consignmentPurposeController.get.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'import/templates/consignment-purpose/index',
        expect.objectContaining({
          purpose: 'internalmarket',
          internalMarketPurpose: 'breeding'
        })
      )
    })

    test('Should check session in correct order (origin first)', () => {
      sessionHelpers.getSessionValue.mockReturnValue('FR')

      consignmentPurposeController.get.handler(mockRequest, mockH)

      const calls = sessionHelpers.getSessionValue.mock.calls
      expect(calls[0][1]).toBe('origin-country')
      expect(calls[1][1]).toBe('purpose')
      expect(calls[2][1]).toBe('internal-market-purpose')
    })
  })

  describe('POST handler', () => {
    describe('Guard redirect', () => {
      test('Should redirect to origin when no origin-country in session', () => {
        sessionHelpers.getSessionValue.mockReturnValue(null)
        mockRequest.payload = {
          purpose: 'internalmarket',
          'internal-market-purpose': 'breeding'
        }

        consignmentPurposeController.post.handler(mockRequest, mockH)

        expect(sessionHelpers.getSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'origin-country'
        )
        expect(mockH.redirect).toHaveBeenCalledWith(
          '/import/consignment/origin'
        )
        expect(sessionHelpers.setSessionValue).not.toHaveBeenCalled()
      })
    })

    describe('Valid submissions', () => {
      beforeEach(() => {
        // Set origin-country in session for all valid submission tests
        sessionHelpers.getSessionValue.mockReturnValue('FR')
      })

      test('Should save valid internalmarket + specific purpose and redirect', () => {
        mockRequest.payload = {
          purpose: 'internalmarket',
          'internal-market-purpose': 'breeding'
        }

        consignmentPurposeController.post.handler(mockRequest, mockH)

        expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'purpose',
          'internalmarket'
        )
        expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'internal-market-purpose',
          'breeding'
        )
        expect(mockH.redirect).toHaveBeenCalledWith('/import/transport')
      })

      test('Should save valid re-entry purpose and redirect', () => {
        mockRequest.payload = {
          purpose: 're-entry'
        }

        consignmentPurposeController.post.handler(mockRequest, mockH)

        expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'purpose',
          're-entry'
        )
        expect(mockH.redirect).toHaveBeenCalledWith('/import/transport')
      })

      test('Should clear internal-market-purpose when purpose is re-entry', () => {
        mockRequest.payload = {
          purpose: 're-entry',
          'internal-market-purpose': 'old-value'
        }

        consignmentPurposeController.post.handler(mockRequest, mockH)

        expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'internal-market-purpose',
          ''
        )
      })
    })

    describe('Validation errors', () => {
      beforeEach(() => {
        // Set origin-country in session for all validation error tests
        sessionHelpers.getSessionValue.mockReturnValue('FR')
      })

      test('Should show error when purpose is empty', () => {
        mockRequest.payload = { purpose: '' }

        consignmentPurposeController.post.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalled()
        expect(mockH.code).toHaveBeenCalledWith(statusCodes.badRequest)

        const viewModel = mockH.view.mock.calls[0][1]
        expect(viewModel.errorList).toBeDefined()
        // Empty string triggers .valid() check, which returns 'any.only' error
        expect(viewModel.errorList[0].text).toContain('Select a valid reason')
      })

      test('Should show error when internalmarket selected without specific purpose', () => {
        mockRequest.payload = {
          purpose: 'internalmarket',
          'internal-market-purpose': ''
        }

        consignmentPurposeController.post.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalled()
        expect(mockH.code).toHaveBeenCalledWith(statusCodes.badRequest)

        const viewModel = mockH.view.mock.calls[0][1]
        expect(viewModel.errorList).toBeDefined()
        expect(viewModel.errorList[0].text).toContain(
          'Select what the animals are for'
        )
      })

      test('Should not save to session when validation fails', () => {
        mockRequest.payload = { purpose: '' }

        consignmentPurposeController.post.handler(mockRequest, mockH)

        expect(sessionHelpers.setSessionValue).not.toHaveBeenCalled()
      })

      test('Should preserve entered values on validation error', () => {
        mockRequest.payload = {
          purpose: 'internalmarket',
          'internal-market-purpose': ''
        }

        consignmentPurposeController.post.handler(mockRequest, mockH)

        const viewModel = mockH.view.mock.calls[0][1]
        expect(viewModel.purpose).toBe('internalmarket')
        expect(viewModel.internalMarketPurpose).toBe('')
      })
    })
  })

  describe('Controller structure', () => {
    test('Should export controller with get and post handlers', () => {
      expect(consignmentPurposeController).toBeDefined()
      expect(consignmentPurposeController.get).toBeDefined()
      expect(consignmentPurposeController.post).toBeDefined()
      expect(typeof consignmentPurposeController.get.handler).toBe('function')
      expect(typeof consignmentPurposeController.post.handler).toBe('function')
    })
  })
})
