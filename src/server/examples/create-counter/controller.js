import {
  setSessionValue,
  getSessionValue
} from '../../common/helpers/session-helpers.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const createCounterController = {
  get: {
    handler(request, h) {
      // Guard: redirect if name or value not completed
      const name = getSessionValue(request, 'example.name')
      const value = getSessionValue(request, 'example.value')

      if (!name) {
        return h.redirect('/example/create/name')
      }
      if (!value) {
        return h.redirect('/example/create/value')
      }

      const existingCounter = getSessionValue(request, 'example.counter')

      return h.view('examples/create-counter/index', {
        pageTitle: 'What is the counter value?',
        heading: 'What is the counter value?',
        counter:
          existingCounter !== null && existingCounter !== undefined
            ? existingCounter.toString()
            : ''
      })
    }
  },

  post: {
    handler(request, h) {
      // Guard: redirect if name or value not completed
      const name = getSessionValue(request, 'example.name')
      const value = getSessionValue(request, 'example.value')

      if (!name) {
        return h.redirect('/example/create/name')
      }
      if (!value) {
        return h.redirect('/example/create/value')
      }

      const { counter } = request.payload

      // Validation
      const errors = []

      // Counter is optional
      if (counter && counter.trim() !== '') {
        const counterNum = parseInt(counter, 10)

        if (isNaN(counterNum)) {
          errors.push({
            text: 'Counter must be a number',
            href: '#counter'
          })
        } else if (counterNum < 0 || counterNum > 999) {
          errors.push({
            text: 'Counter must be between 0 and 999',
            href: '#counter'
          })
        }
      }

      if (errors.length > 0) {
        return h
          .view('examples/create-counter/index', {
            pageTitle: 'What is the counter value?',
            heading: 'What is the counter value?',
            counter,
            errorList: errors,
            formError: {
              text: errors[0].text
            }
          })
          .code(statusCodes.badRequest)
      }

      // Store in session (null if empty, otherwise integer)
      const counterValue =
        counter && counter.trim() !== '' ? parseInt(counter, 10) : null
      setSessionValue(request, 'example.counter', counterValue)

      // Redirect to check answers
      return h.redirect('/example/create/check')
    }
  }
}
