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
      const commodityCodeDetails = getSessionValue(
        request,
        'commodity-code-details'
      )
      const purpose = getSessionValue(request, 'purpose')
      const bcp = getSessionValue(request, 'bcp')

      if (!originCountry || !purpose) {
        return h.redirect('/import/consignment/origin')
      }

      // Load all journey data from session
      const sessionData = {
        'origin-country': originCountry,
        'commodity-code-details': commodityCodeDetails,
        purpose,
        'internal-market-purpose': getSessionValue(
          request,
          'internal-market-purpose'
        ),
        'commodity-selected-species': getSessionValue(
          request,
          'commodity-selected-species'
        ),
        bcp
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
      setSessionValue(request, 'draft-notification-id', '')
      setSessionValue(request, 'origin-country', '')
      setSessionValue(request, 'purpose', '')
      setSessionValue(request, 'internal-market-purpose', '')
      setSessionValue(request, 'internal-market-purpose', '')
      // clear commodity code details
      setSessionValue(request, 'commodity-codes', '')
      setSessionValue(request, 'commodity-code-details', '')
      setSessionValue(request, 'commodity-selected-species', '')
      setSessionValue(request, 'commodity-type', '')
      setSessionValue(request, 'commodity-selected-tab', '')
      setSessionValue(request, 'species-selected-tab', '')
      // Clear transport details
      setSessionValue(request, 'bcp', '')
      setSessionValue(request, 'transport-means-before', '')
      setSessionValue(request, 'vehicle-identifier', '')

      // Store CHED reference in session for confirmation page
      setSessionValue(request, 'chedReference', chedReference)

      // Redirect to confirmation page
      return h.redirect('/import/confirmation')
    },
    options: {}
  }
}
