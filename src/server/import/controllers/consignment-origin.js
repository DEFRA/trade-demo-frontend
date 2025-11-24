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

      // Redirect to next step (purpose screen)
      return h.redirect('/import/commodity/codes')
    }
  }
}
