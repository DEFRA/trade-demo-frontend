import {
  setSessionValue,
  getSessionValue
} from '../../common/helpers/session-helpers.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { originSchema } from '../schemas/origin-schema.js'
import { buildOriginViewModel } from '../helpers/view-models.js'

export const consignmentOriginController = {
  get: {
    handler(request, h) {
      // Check if this is a "New Import" request from dashboard
      if (request.query?.new === 'true') {
        // Clear all journey data to start fresh
        setSessionValue(request, 'notification-id', '')
        setSessionValue(request, 'origin-country', '')
        setSessionValue(request, 'purpose', '')
        setSessionValue(request, 'internal-market-purpose', '')
        setSessionValue(request, 'commodity-code', '')
        setSessionValue(request, 'commodity-codes', '')
        setSessionValue(request, 'commodity-code-details', '')
        setSessionValue(request, 'commodity-code-description', '')
        setSessionValue(request, 'commodity-selected-species', '')
        setSessionValue(request, 'commodity-type', '')
        setSessionValue(request, 'commodity-selected-tab', '')
        setSessionValue(request, 'species-selected-tab', '')
        setSessionValue(request, 'bcp', '')
        setSessionValue(request, 'transport-means-before', '')
        setSessionValue(request, 'vehicle-identifier', '')
        setSessionValue(request, 'chedReference', '')

        // Redirect without query parameter to clean URL
        return h.redirect('/import/consignment/origin')
      }

      const sessionData = {
        'origin-country': getSessionValue(request, 'origin-country')
      }

      const viewModel = buildOriginViewModel(sessionData)
      return h.view('import/templates/consignment-origin/index', viewModel)
    }
  },

  post: {
    handler(request, h) {
      const { 'origin-country': originCountry } = request.payload

      // Validate using Joi schema
      const { error } = originSchema.validate(request.payload, {
        abortEarly: false
      })

      if (error) {
        const sessionData = { 'origin-country': originCountry }
        const viewModel = buildOriginViewModel(sessionData, error)
        return h
          .view('import/templates/consignment-origin/index', viewModel)
          .code(statusCodes.badRequest)
      }

      // Store in session
      setSessionValue(request, 'origin-country', originCountry.trim())
      setSessionValue(request, 'commodity-selected-tab', '')
      setSessionValue(request, 'species-selected-tab', '')

      // Redirect to next step (purpose screen)
      return h.redirect('/import/commodity/codes')
    }
  }
}
