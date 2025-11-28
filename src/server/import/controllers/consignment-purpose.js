import {
  setSessionValue,
  getSessionValue
} from '../../common/helpers/session-helpers.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { purposeSchema } from '../schemas/purpose-schema.js'
import { buildPurposeViewModel } from '../helpers/view-models.js'

export const consignmentPurposeController = {
  get: {
    handler(request, h) {
      // Guard: ensure origin-country is set
      const originCountry = getSessionValue(request, 'origin-country')
      if (!originCountry) {
        return h.redirect('/import/consignment/origin')
      }

      // Load existing data from session
      const sessionData = {
        purpose: getSessionValue(request, 'purpose'),
        'internal-market-purpose': getSessionValue(
          request,
          'internal-market-purpose'
        )
      }

      const viewModel = buildPurposeViewModel(sessionData)
      return h.view('import/templates/consignment-purpose/index', viewModel)
    }
  },

  post: {
    handler(request, h) {
      // Guard: ensure origin-country is set
      const originCountry = getSessionValue(request, 'origin-country')
      if (!originCountry) {
        return h.redirect('/import/consignment/origin')
      }

      const { purpose, 'internal-market-purpose': internalMarketPurpose } =
        request.payload

      // Validate using Joi schema
      const { error } = purposeSchema.validate(request.payload, {
        abortEarly: false
      })

      if (error) {
        const sessionData = {
          purpose,
          'internal-market-purpose': internalMarketPurpose
        }
        const viewModel = buildPurposeViewModel(sessionData, error)
        return h
          .view('import/templates/consignment-purpose/index', viewModel)
          .code(statusCodes.badRequest)
      }

      // Store purpose in session
      setSessionValue(request, 'purpose', purpose)

      // Store internal market purpose if provided
      if (purpose === 'internalmarket' && internalMarketPurpose) {
        setSessionValue(
          request,
          'internal-market-purpose',
          internalMarketPurpose
        )
      } else {
        // Clear internal-market-purpose if not applicable
        setSessionValue(request, 'internal-market-purpose', '')
      }

      // Redirect to review screen
      return h.redirect('/import/transport')
    }
  }
}
