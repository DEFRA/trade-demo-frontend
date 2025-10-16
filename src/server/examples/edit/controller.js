import { exampleApi } from '../../common/helpers/api-client.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const editController = {
  get: {
    handler: async (request, h) => {
      const { id } = request.params
      const traceId = request.headers['x-cdp-request-id']

      try {
        const example = await exampleApi.findById(id, traceId)

        return h.view('examples/edit/index', {
          pageTitle: 'Edit example',
          heading: 'Edit example',
          example
        })
      } catch (error) {
        request.logger.error(
          `Failed to fetch example ${id} for editing: ${error.message}`,
          error
        )

        if (error.statusCode === 404) {
          return h.redirect('/examples')
        }

        return h
          .view('examples/edit/index', {
            pageTitle: 'Error',
            heading: 'Error',
            errorList: [
              {
                text: 'Unable to load example. Please try again later.'
              }
            ]
          })
          .code(statusCodes.internalServerError)
      }
    }
  },

  post: {
    handler: async (request, h) => {
      const { id } = request.params
      const { name, value, counter } = request.payload
      const traceId = request.headers['x-cdp-request-id']

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
          .view('examples/edit/index', {
            pageTitle: 'Edit example',
            heading: 'Edit example',
            example: {
              id,
              name,
              value,
              counter
            },
            errorList: errors
          })
          .code(statusCodes.badRequest)
      }

      // Update in backend
      const counterValue =
        counter && counter.trim() !== '' ? parseInt(counter, 10) : null

      try {
        await exampleApi.update(
          id,
          {
            name: name.trim(),
            value: value.trim(),
            counter: counterValue
          },
          traceId
        )

        // Redirect to view page
        return h.redirect(`/example/${id}`)
      } catch (error) {
        request.logger.error(
          `Failed to update example ${id}: ${error.message}`,
          error
        )

        return h
          .view('examples/edit/index', {
            pageTitle: 'Edit example',
            heading: 'Edit example',
            example: {
              id,
              name,
              value,
              counter
            },
            errorList: [
              {
                text: 'Unable to update example. Please try again later.',
                href: '#'
              }
            ]
          })
          .code(statusCodes.internalServerError)
      }
    }
  }
}
