import {
  getSessionValue,
  resetSession
} from '../../common/helpers/session-helpers.js'
import { exampleApi } from '../../common/helpers/api-client.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const createCheckController = {
  get: {
    handler(request, h) {
      // Guard: redirect if required fields not completed
      const name = getSessionValue(request, 'example.name')
      const value = getSessionValue(request, 'example.value')

      if (!name) {
        return h.redirect('/example/create/name')
      }
      if (!value) {
        return h.redirect('/example/create/value')
      }

      const counter = getSessionValue(request, 'example.counter')

      return h.view('examples/create-check/index', {
        pageTitle: 'Check your answers',
        heading: 'Check your answers',
        name,
        value,
        counter
      })
    }
  },

  post: {
    async handler(request, h) {
      // Guard: redirect if required fields not completed
      const name = getSessionValue(request, 'example.name')
      const value = getSessionValue(request, 'example.value')

      if (!name) {
        return h.redirect('/example/create/name')
      }
      if (!value) {
        return h.redirect('/example/create/value')
      }

      const counter = getSessionValue(request, 'example.counter')
      const traceId = request.headers['x-cdp-request-id']

      try {
        // Submit to backend API
        const created = await exampleApi.create(
          {
            name,
            value,
            counter
          },
          traceId
        )

        // Clear session on success
        resetSession(request)

        // Redirect to confirmation page with created ID
        return h.redirect(`/example/create/confirmation?id=${created.id}`)
      } catch (error) {
        request.logger.error(
          `Failed to create example: ${error.message}`,
          error
        )

        return h
          .view('examples/create-check/index', {
            pageTitle: 'Check your answers',
            heading: 'Check your answers',
            name,
            value,
            counter,
            errorList: [
              {
                text: 'Unable to create example. Please try again later.',
                href: '#'
              }
            ]
          })
          .code(statusCodes.internalServerError)
      }
    }
  }
}
