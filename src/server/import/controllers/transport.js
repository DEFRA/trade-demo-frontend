import {
  setSessionValue,
  getSessionValue
} from '../../common/helpers/session-helpers.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { buildTransportViewModel } from '../helpers/view-models.js'
import { GET } from '../integration/http_client.js'
import { config } from '../../../config/config.js'

const backendBaseUrl = config.get('backendApi.baseUrl')
const tracingHeader = config.get('tracing.header')

export const transportDetailsController = {
  get: {
    handler(request, h) {
      const sessionData = {
        bcp: getSessionValue(request, 'bcp'),
        'transport-means-before': getSessionValue(
          request,
          'transport-means-before'
        ),
        'vehicle-identifier': getSessionValue(request, 'vehicle-identifier')
      }

      const viewModel = buildTransportViewModel(sessionData)

      return h.view('import/templates/transport/index', viewModel)
    }
  },

  post: {
    async handler(request, h) {
      const {
        bcp,
        'transport-means-before': transportMeansBefore,
        'vehicle-identifier': vehicleIdentifier
      } = request.payload

      if (!bcp || bcp.trim().length === 0) {
        const error = {
          details: [
            {
              path: ['bcp'],
              message: 'Enter a BCP or Port of Entry'
            }
          ]
        }

        const sessionData = {
          bcp,
          'transport-means-before': transportMeansBefore,
          'vehicle-identifier': vehicleIdentifier
        }

        const viewModel = buildTransportViewModel(sessionData, error)
        return h
          .view('import/templates/transport/index', viewModel)
          .code(statusCodes.badRequest)
      }

      // Store in session
      setSessionValue(request, 'bcp', bcp.trim())
      setSessionValue(
        request,
        'transport-means-before',
        transportMeansBefore.trim()
      )
      setSessionValue(request, 'vehicle-identifier', vehicleIdentifier.trim())

      // Redirect to next step (purpose screen)
      return h.redirect('/import/review')
    }
  },

  // API endpoint for autocomplete
  api: {
    async handler(request, h) {
      const { q: query } = request.query
      const traceId = request.headers[tracingHeader] || 'no-trace-id'

      try {
        const bcps = await GET({
          url: `${backendBaseUrl}/border-entities/bcps`,
          headers: {
            [tracingHeader]: traceId
          }
        })

        // Filter based on query parameter if provided
        if (query && query.length >= 3) {
          const filteredBcps = bcps.filter(
            (bcp) =>
              (bcp.name &&
                bcp.name.toLowerCase().includes(query.toLowerCase())) ||
              (bcp.code && bcp.code.toLowerCase().includes(query.toLowerCase()))
          )
          return h.response(filteredBcps).type('application/json')
        }

        return h.response(bcps).type('application/json')
      } catch (error) {
        request.logger.error('Error fetching BCP data:', error)
        return h.response([]).type('application/json')
      }
    }
  }
}
