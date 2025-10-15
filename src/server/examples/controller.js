/**
 * Examples list controller
 * Fetches examples from backend and implements client-side search
 */

import { exampleApi } from '../common/helpers/api-client.js'
import { statusCodes } from '../common/constants/status-codes.js'

export const examplesController = {
  list: {
    async handler(request, h) {
      try {
        const traceId = request.headers['x-cdp-request-id']
        const searchQuery = request.query.search || ''

        // Fetch all examples from backend
        const allExamples = await exampleApi.findAll(traceId)

        // Client-side filter by name
        const examples = searchQuery
          ? allExamples.filter((e) =>
              e.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : allExamples

        return h.view('examples/list', {
          pageTitle: 'All Examples',
          heading: 'All Examples',
          examples,
          searchQuery,
          hasResults: examples.length > 0,
          totalCount: allExamples.length
        })
      } catch (error) {
        request.logger.error(`Failed to fetch examples: ${error.message}`)

        // Return error view with user-friendly message
        return h
          .view('examples/list', {
            pageTitle: 'All Examples',
            heading: 'All Examples',
            examples: [],
            searchQuery: '',
            hasResults: false,
            totalCount: 0,
            errorMessage: 'Unable to load examples. Please try again later.'
          })
          .code(statusCodes.internalServerError)
      }
    }
  }
}
