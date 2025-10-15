import {
  setSessionValue,
  getSessionValue
} from '../../common/helpers/session-helpers.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const createValueController = {
  get: {
    handler(request, h) {
      // Guard: redirect if name not completed
      const name = getSessionValue(request, 'example.name')
      if (!name) {
        return h.redirect('/example/create/name')
      }

      const existingValue = getSessionValue(request, 'example.value')

      return h.view('examples/create-value/index', {
        pageTitle: 'What is the value?',
        heading: 'What is the value?',
        value: existingValue || ''
      })
    }
  },

  post: {
    handler(request, h) {
      // Guard: redirect if name not completed
      const name = getSessionValue(request, 'example.name')
      if (!name) {
        return h.redirect('/example/create/name')
      }

      const { value } = request.payload

      // Validation
      const errors = []

      if (!value || value.trim() === '') {
        errors.push({
          text: 'Enter a value',
          href: '#value'
        })
      } else if (value.length > 500) {
        errors.push({
          text: 'Value must be 500 characters or less',
          href: '#value'
        })
      }

      if (errors.length > 0) {
        return h
          .view('examples/create-value/index', {
            pageTitle: 'What is the value?',
            heading: 'What is the value?',
            value,
            errorList: errors,
            formError: {
              text: errors[0].text
            }
          })
          .code(statusCodes.badRequest)
      }

      // Store in session
      setSessionValue(request, 'example.value', value.trim())

      // Redirect to next step
      return h.redirect('/example/create/counter')
    }
  }
}
