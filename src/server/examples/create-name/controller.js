import {
  setSessionValue,
  getSessionValue
} from '../../common/helpers/session-helpers.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const createNameController = {
  get: {
    handler(request, h) {
      const existingName = getSessionValue(request, 'example.name')

      return h.view('examples/create-name/index', {
        pageTitle: 'What is the name?',
        heading: 'What is the name?',
        name: existingName || ''
      })
    }
  },

  post: {
    handler(request, h) {
      const { name } = request.payload

      // Validation
      const errors = []

      if (!name || name.trim() === '') {
        errors.push({
          text: 'Enter a name',
          href: '#name'
        })
      } else if (name.length > 100) {
        errors.push({
          text: 'Name must be 100 characters or less',
          href: '#name'
        })
      }

      if (errors.length > 0) {
        return h
          .view('examples/create-name/index', {
            pageTitle: 'What is the name?',
            heading: 'What is the name?',
            name,
            errorList: errors,
            formError: {
              text: errors[0].text
            }
          })
          .code(statusCodes.badRequest)
      }

      // Store in session
      setSessionValue(request, 'example.name', name.trim())

      // Redirect to next step
      return h.redirect('/example/create/value')
    }
  }
}
