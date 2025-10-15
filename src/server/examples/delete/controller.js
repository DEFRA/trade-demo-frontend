import { exampleApi } from '../../common/helpers/api-client.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const deleteController = {
  get: {
    handler: async (request, h) => {
      const { id } = request.params
      const traceId = request.headers['x-cdp-request-id']

      try {
        const example = await exampleApi.findById(id, traceId)

        return h.view('examples/delete/index', {
          pageTitle: 'Delete example',
          heading: 'Are you sure you want to delete this example?',
          example
        })
      } catch (error) {
        request.logger.error(
          `Failed to fetch example ${id} for deletion: ${error.message}`,
          error
        )

        if (error.statusCode === 404) {
          return h.redirect('/examples')
        }

        return h.redirect('/examples')
      }
    }
  },

  post: {
    handler: async (request, h) => {
      const { id } = request.params
      const traceId = request.headers['x-cdp-request-id']

      try {
        await exampleApi.delete(id, traceId)

        // Redirect to examples list with success
        return h.redirect('/examples')
      } catch (error) {
        request.logger.error(
          `Failed to delete example ${id}: ${error.message}`,
          error
        )

        // Try to fetch the example to display error on confirmation page
        try {
          const example = await exampleApi.findById(id, traceId)

          return h
            .view('examples/delete/index', {
              pageTitle: 'Delete example',
              heading: 'Are you sure you want to delete this example?',
              example,
              errorList: [
                {
                  text: 'Unable to delete example. Please try again later.',
                  href: '#delete-button'
                }
              ]
            })
            .code(statusCodes.internalServerError)
        } catch (fetchError) {
          // If we can't even fetch the example, redirect to list
          return h.redirect('/examples')
        }
      }
    }
  }
}
