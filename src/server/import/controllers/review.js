import {
  setSessionValue,
  getSessionValue
} from '../../common/helpers/session-helpers.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { reviewSchema } from '../schemas/review-schema.js'
import { buildReviewViewModel } from '../helpers/view-models.js'
import { buildNotificationDto } from '../helpers/notification-builder.js'
import { notificationApi } from '../../common/helpers/api-client.js'

export const reviewController = {
  get: {
    handler(request, h) {
      // Guard: ensure required fields from previous steps are set
      const originCountry = getSessionValue(request, 'origin-country')
      const commodityCodeDetails = getSessionValue(
        request,
        'commodity-code-details'
      )
      const purpose = getSessionValue(request, 'purpose')
      const bcp = getSessionValue(request, 'bcp')

      if (!originCountry || !purpose) {
        return h.redirect('/import/consignment/origin')
      }

      // Load all journey data from session
      const sessionData = {
        'origin-country': originCountry,
        'commodity-code': getSessionValue(request, 'commodity-code'),
        'commodity-code-details': commodityCodeDetails,
        'commodity-code-description': getSessionValue(
          request,
          'commodity-code-description'
        ),
        purpose,
        'internal-market-purpose': getSessionValue(
          request,
          'internal-market-purpose'
        ),
        'commodity-selected-species': getSessionValue(
          request,
          'commodity-selected-species'
        ),
        bcp
      }

      const viewModel = buildReviewViewModel(sessionData)
      return h.view('import/templates/review/index', viewModel)
    },
    options: {}
  },

  post: {
    async handler(request, h) {
      const traceId = request.headers['x-cdp-request-id'] || 'no-trace-id'

      // Guard: ensure required fields from previous steps are set
      const originCountry = getSessionValue(request, 'origin-country')
      const purpose = getSessionValue(request, 'purpose')

      if (!originCountry || !purpose) {
        return h.redirect('/import/consignment/origin')
      }

      // Validate confirmation checkbox
      const { error } = reviewSchema.validate(request.payload, {
        abortEarly: false
      })

      if (error) {
        // Re-render with validation errors
        const sessionData = {
          'origin-country': originCountry,
          'commodity-code': getSessionValue(request, 'commodity-code'),
          'commodity-code-details': getSessionValue(
            request,
            'commodity-code-details'
          ),
          'commodity-code-description': getSessionValue(
            request,
            'commodity-code-description'
          ),
          purpose,
          'internal-market-purpose': getSessionValue(
            request,
            'internal-market-purpose'
          ),
          'commodity-selected-species': getSessionValue(
            request,
            'commodity-selected-species'
          ),
          bcp: getSessionValue(request, 'bcp')
        }
        const viewModel = buildReviewViewModel(sessionData, error)
        return h
          .view('import/templates/review/index', viewModel)
          .code(statusCodes.badRequest)
      }

      // Collect all session data for submission
      const sessionData = {
        'notification-id': getSessionValue(request, 'notification-id'),
        'origin-country': originCountry,
        'commodity-code': getSessionValue(request, 'commodity-code'),
        'commodity-code-details': getSessionValue(
          request,
          'commodity-code-details'
        ),
        'commodity-code-description': getSessionValue(
          request,
          'commodity-code-description'
        ),
        'commodity-type': getSessionValue(request, 'commodity-type'),
        'commodity-selected-species': getSessionValue(
          request,
          'commodity-selected-species'
        ),
        purpose,
        'internal-market-purpose': getSessionValue(
          request,
          'internal-market-purpose'
        ),
        bcp: getSessionValue(request, 'bcp'),
        'transport-means-before': getSessionValue(
          request,
          'transport-means-before'
        ),
        'vehicle-identifier': getSessionValue(request, 'vehicle-identifier')
      }

      // Build notification DTO with SUBMITTED status
      const notificationDto = buildNotificationDto(sessionData, 'SUBMITTED')

      request.logger.info(
        `Submitting notification: ${JSON.stringify(notificationDto)}`
      )

      try {
        // Submit notification to backend
        const submittedNotification = await notificationApi.saveDraft(
          notificationDto,
          traceId
        )

        request.logger.info(
          `Notification submitted successfully: ${submittedNotification.id}`
        )

        // Clear journey data
        setSessionValue(request, 'notification-id', '')
        setSessionValue(request, 'origin-country', '')
        setSessionValue(request, 'purpose', '')
        setSessionValue(request, 'internal-market-purpose', '')
        // clear commodity code details
        setSessionValue(request, 'commodity-code', '')
        setSessionValue(request, 'commodity-codes', '')
        setSessionValue(request, 'commodity-code-details', '')
        setSessionValue(request, 'commodity-code-description', '')
        setSessionValue(request, 'commodity-selected-species', '')
        setSessionValue(request, 'commodity-type', '')
        setSessionValue(request, 'commodity-selected-tab', '')
        setSessionValue(request, 'species-selected-tab', '')
        // Clear transport details
        setSessionValue(request, 'bcp', '')
        setSessionValue(request, 'transport-means-before', '')
        setSessionValue(request, 'vehicle-identifier', '')

        // Store notification ID in session for confirmation page
        setSessionValue(request, 'notification-id', submittedNotification.id)

        // Redirect to confirmation page
        return h.redirect('/import/confirmation')
      } catch (error) {
        request.logger.error(`Failed to submit notification: ${error.message}`)

        // Re-render review page with error
        const viewModel = buildReviewViewModel(sessionData)
        viewModel.submissionError =
          'Failed to submit notification. Please try again.'

        return h
          .view('import/templates/review/index', viewModel)
          .code(statusCodes.internalServerError)
      }
    },
    options: {}
  }
}
