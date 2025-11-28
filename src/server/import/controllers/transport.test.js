import { describe, test, expect, vi, beforeEach } from 'vitest'
import { transportDetailsController } from './transport.js'
import * as sessionHelpers from '../../common/helpers/session-helpers.js'
import { statusCodes } from '../../common/constants/status-codes.js'

// Mock dependencies
vi.mock('../../common/helpers/session-helpers.js')
vi.mock('node-fetch')

describe('transportDetailsController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Mock request object
    mockRequest = {
      payload: {},
      query: {},
      headers: {},
      yar: {
        get: vi.fn(),
        set: vi.fn()
      }
    }

    // Mock h (response toolkit)
    mockH = {
      view: vi.fn().mockReturnThis(),
      redirect: vi.fn(),
      code: vi.fn().mockReturnThis(),
      response: vi.fn().mockReturnThis(),
      type: vi.fn().mockReturnThis()
    }
  })

  describe('GET handler', () => {
    test('Should render transport page with empty values when no session data', () => {
      sessionHelpers.getSessionValue.mockReturnValue(null)

      transportDetailsController.get.handler(mockRequest, mockH)

      expect(sessionHelpers.getSessionValue).toHaveBeenCalledWith(
        mockRequest,
        'bcp'
      )
      expect(sessionHelpers.getSessionValue).toHaveBeenCalledWith(
        mockRequest,
        'transport-means-before'
      )
      expect(sessionHelpers.getSessionValue).toHaveBeenCalledWith(
        mockRequest,
        'vehicle-identifier'
      )
      expect(mockH.view).toHaveBeenCalledWith(
        'import/templates/transport/index',
        expect.objectContaining({
          pageTitle: 'Transport to the BCP or Port of Entry',
          heading: 'Transport to the BCP or Port of Entry',
          bcp: '',
          transportMeansBefore: '',
          vehicleIdentifier: ''
        })
      )
    })

    test('Should render transport page with existing session data', () => {
      sessionHelpers.getSessionValue
        .mockReturnValueOnce('Dover') // bcp
        .mockReturnValueOnce('Road Vehicle') // transport-means-before
        .mockReturnValueOnce('AB123CD') // vehicle-identifier

      transportDetailsController.get.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'import/templates/transport/index',
        expect.objectContaining({
          bcp: 'Dover',
          transportMeansBefore: 'Road Vehicle',
          vehicleIdentifier: 'AB123CD'
        })
      )
    })

    test('Should call session helpers in correct order', () => {
      sessionHelpers.getSessionValue.mockReturnValue('test')

      transportDetailsController.get.handler(mockRequest, mockH)

      const calls = sessionHelpers.getSessionValue.mock.calls
      expect(calls[0][1]).toBe('bcp')
      expect(calls[1][1]).toBe('transport-means-before')
      expect(calls[2][1]).toBe('vehicle-identifier')
    })

    test('Should call view with correct template path', () => {
      sessionHelpers.getSessionValue.mockReturnValue(null)

      transportDetailsController.get.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledTimes(1)
      const templatePath = mockH.view.mock.calls[0][0]
      expect(templatePath).toBe('import/templates/transport/index')
    })
  })

  describe('POST handler', () => {
    describe('Valid submissions', () => {
      test('Should save valid transport data and redirect to review', async () => {
        mockRequest.payload = {
          bcp: 'Dover',
          'transport-means-before': 'Road Vehicle',
          'vehicle-identifier': 'AB123CD'
        }

        await transportDetailsController.post.handler(mockRequest, mockH)

        expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'bcp',
          'Dover'
        )
        expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'transport-means-before',
          'Road Vehicle'
        )
        expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'vehicle-identifier',
          'AB123CD'
        )
        expect(mockH.redirect).toHaveBeenCalledWith('/import/review')
      })

      test('Should trim whitespace from all fields before saving', async () => {
        mockRequest.payload = {
          bcp: '  Dover  ',
          'transport-means-before': '  Road Vehicle  ',
          'vehicle-identifier': '  AB123CD  '
        }

        await transportDetailsController.post.handler(mockRequest, mockH)

        expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'bcp',
          'Dover'
        )
        expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'transport-means-before',
          'Road Vehicle'
        )
        expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'vehicle-identifier',
          'AB123CD'
        )
      })

      test('Should handle empty optional fields correctly', async () => {
        mockRequest.payload = {
          bcp: 'Dover',
          'transport-means-before': '',
          'vehicle-identifier': ''
        }

        await transportDetailsController.post.handler(mockRequest, mockH)

        expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'bcp',
          'Dover'
        )
        expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'transport-means-before',
          ''
        )
        expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'vehicle-identifier',
          ''
        )
        expect(mockH.redirect).toHaveBeenCalledWith('/import/review')
      })
    })

    describe('Validation errors', () => {
      test('Should show error when BCP is empty', async () => {
        mockRequest.payload = {
          bcp: '',
          'transport-means-before': 'Road Vehicle',
          'vehicle-identifier': 'AB123CD'
        }

        await transportDetailsController.post.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalled()
        expect(mockH.code).toHaveBeenCalledWith(statusCodes.badRequest)

        const viewModel = mockH.view.mock.calls[0][1]
        expect(viewModel.errorList).toBeDefined()
        expect(viewModel.errorList[0].text).toContain(
          'Enter a BCP or Port of Entry'
        )
        expect(viewModel.formError).toBeDefined()
        expect(viewModel.formError.text).toContain(
          'Enter a BCP or Port of Entry'
        )
      })

      test('Should show error when BCP is only whitespace', async () => {
        mockRequest.payload = {
          bcp: '   ',
          'transport-means-before': 'Road Vehicle',
          'vehicle-identifier': 'AB123CD'
        }

        await transportDetailsController.post.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalled()
        expect(mockH.code).toHaveBeenCalledWith(statusCodes.badRequest)

        const viewModel = mockH.view.mock.calls[0][1]
        expect(viewModel.errorList).toBeDefined()
        expect(viewModel.errorList[0].text).toContain(
          'Enter a BCP or Port of Entry'
        )
      })

      test('Should show error when BCP is missing from payload', async () => {
        mockRequest.payload = {
          'transport-means-before': 'Road Vehicle',
          'vehicle-identifier': 'AB123CD'
        }

        await transportDetailsController.post.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalled()
        expect(mockH.code).toHaveBeenCalledWith(statusCodes.badRequest)
      })

      test('Should not save to session when validation fails', async () => {
        mockRequest.payload = {
          bcp: '',
          'transport-means-before': 'Road Vehicle',
          'vehicle-identifier': 'AB123CD'
        }

        await transportDetailsController.post.handler(mockRequest, mockH)

        expect(sessionHelpers.setSessionValue).not.toHaveBeenCalled()
      })

      test('Should preserve entered values on validation error', async () => {
        mockRequest.payload = {
          bcp: '',
          'transport-means-before': 'Road Vehicle',
          'vehicle-identifier': 'AB123CD'
        }

        await transportDetailsController.post.handler(mockRequest, mockH)

        const viewModel = mockH.view.mock.calls[0][1]
        expect(viewModel.bcp).toBe('')
        expect(viewModel.transportMeansBefore).toBe('Road Vehicle')
        expect(viewModel.vehicleIdentifier).toBe('AB123CD')
      })

      test('Should render same template on validation error', async () => {
        mockRequest.payload = { bcp: '' }

        await transportDetailsController.post.handler(mockRequest, mockH)

        expect(mockH.view).toHaveBeenCalledWith(
          'import/templates/transport/index',
          expect.any(Object)
        )
      })
    })
  })

  describe('Controller structure', () => {
    test('Should export controller with get, post, and api handlers', () => {
      expect(transportDetailsController).toBeDefined()
      expect(transportDetailsController.get).toBeDefined()
      expect(transportDetailsController.post).toBeDefined()
      expect(transportDetailsController.api).toBeDefined()
      expect(typeof transportDetailsController.get.handler).toBe('function')
      expect(typeof transportDetailsController.post.handler).toBe('function')
      expect(typeof transportDetailsController.api.handler).toBe('function')
    })

    test('Should have async POST handler', () => {
      const postHandler = transportDetailsController.post.handler
      expect(postHandler.constructor.name).toBe('AsyncFunction')
    })

    test('Should have async API handler', () => {
      const apiHandler = transportDetailsController.api.handler
      expect(apiHandler.constructor.name).toBe('AsyncFunction')
    })
  })
})
