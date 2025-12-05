import { describe, test, expect, vi, beforeEach } from 'vitest'
import { commodityQuantitiesController } from './commodity-quantities.js'
import * as sessionHelpers from '../../common/helpers/session-helpers.js'

// Mock session helpers
vi.mock('../../common/helpers/session-helpers.js')

describe('commodityQuantitiesController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      query: {},
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
  })

  describe('saveQuantities handler', () => {
    test('Should set isCommodityCodeFlowComplete to true on success', () => {
      // Setup session with selected species
      const mockSpecies = [{ value: '12356', noOfAnimals: '10' }]
      sessionHelpers.getSessionValue.mockReturnValue(mockSpecies)

      commodityQuantitiesController.saveQuantities.handler(mockRequest, mockH)

      // Verify it sets the flow completion flag
      expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
        mockRequest,
        'isCommodityCodeFlowComplete',
        true
      )

      // Verify redirect
      expect(mockH.redirect).toHaveBeenCalledWith('/import/consignment/purpose')
    })
  })
})
