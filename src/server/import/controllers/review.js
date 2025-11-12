import {
  setSessionValue,
  getSessionValue
} from '../../common/helpers/session-helpers.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { reviewSchema } from '../schemas/review-schema.js'
import { buildReviewViewModel } from '../helpers/view-models.js'

/**
 * Generate a mock CHED reference
 * In production, this would be returned from the IPAFFS API
 * @returns {string} CHED reference in format CHEDP.GB.YYYY.NNNNNNN
 */
function generateChedReference() {
  const year = new Date().getFullYear()
  const randomNumber = Math.floor(1000000 + Math.random() * 9000000)
  return `CHEDP.GB.${year}.${randomNumber}`
}

export const reviewController = {
  get: {
    handler(request, h) {
      // Guard: ensure required fields from previous steps are set
      const originCountry = getSessionValue(request, 'origin-country')
      const purpose = getSessionValue(request, 'purpose')

      if (!originCountry || !purpose) {
        return h.redirect('/import/consignment/origin')
      }

      // Load all journey data from session
      const sessionData = {
        'origin-country': originCountry,
        purpose,
        'internal-market-purpose': getSessionValue(
          request,
          'internal-market-purpose'
        )
      }

      const viewModel = buildReviewViewModel(sessionData)
      return h.view('import/templates/review/index', viewModel)
    },
    options: {}
  },

  post: {
    handler(request, h) {
      // Guard: ensure required fields from previous steps are set
      const originCountry = getSessionValue(request, 'origin-country')
      const purpose = getSessionValue(request, 'purpose')

      if (!originCountry || !purpose) {
        return h.redirect('/import/consignment/origin')
      }

      // Validate confirmation checkbox
      const { error } = reviewSchema.validate(request.payload, {
        abortEarly: false
      })

      if (error) {
        // Re-render with validation errors
        const sessionData = {
          'origin-country': originCountry,
          purpose,
          'internal-market-purpose': getSessionValue(
            request,
            'internal-market-purpose'
          )
        }
        const viewModel = buildReviewViewModel(sessionData, error)
        return h
          .view('import/templates/review/index', viewModel)
          .code(statusCodes.badRequest)
      }

      // Generate CHED reference (mock implementation)
      const chedReference = generateChedReference()

      // Clear journey data
      setSessionValue(request, 'origin-country', '')
      setSessionValue(request, 'purpose', '')
      setSessionValue(request, 'internal-market-purpose', '')

      // Store CHED reference in session for confirmation page
      setSessionValue(request, 'chedReference', chedReference)

      // Redirect to confirmation page
      return h.redirect('/import/confirmation')
    },
    options: {}
  }
}
