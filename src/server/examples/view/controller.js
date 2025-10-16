import { exampleApi } from '../../common/helpers/api-client.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const viewController = {
  handler: async (request, h) => {
    const { id } = request.params
    const traceId = request.headers['x-cdp-request-id']

    try {
      const example = await exampleApi.findById(id, traceId)

      return h.view('examples/view/index', {
        pageTitle: example.name,
        heading: example.name,
        example
      })
    } catch (error) {
      request.logger.error(
        `Failed to fetch example ${id}: ${error.message}`,
        error
      )

      if (error.statusCode === 404) {
        return h
          .view('examples/view/index', {
            pageTitle: 'Example not found',
            heading: 'Example not found',
            errorMessage: 'The example you are looking for does not exist.',
            notFound: true
          })
          .code(statusCodes.notFound)
      }

      return h
        .view('examples/view/index', {
          pageTitle: 'Error',
          heading: 'Error',
          errorMessage: 'Unable to load example. Please try again later.'
        })
        .code(statusCodes.internalServerError)
    }
  }
}
