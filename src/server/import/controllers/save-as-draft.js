import {
  setSessionValue,
  getSessionValue
} from '../../common/helpers/session-helpers.js'
import { notificationApi } from '../../common/helpers/api-client.js'
import {
  buildNotificationDto,
  hasNotificationData
} from '../helpers/notification-builder.js'

/**
 * Save as Draft Controller
 *
 * Handles "Save as Draft" AJAX requests from any page in the import journey.
 * Accepts current form data, saves to session first, then sends to backend.
 * Returns JSON response for client-side feedback.
 */
export const saveAsDraftController = {
  post: {
    async handler(request, h) {
      const traceId = request.headers['x-cdp-request-id'] || 'no-trace-id'

      // Extract form data from request body (if provided)
      const formData = request.payload?.formData || {}

      // Debug logging
      request.logger.info(
        `Save as draft - received payload: ${JSON.stringify(request.payload)}`
      )
      request.logger.info(
        `Save as draft - extracted formData: ${JSON.stringify(formData)}`
      )

      // Save current form data to session first (reusing existing pattern)
      if (formData['origin-country']) {
        request.logger.info(
          `Saving origin-country to session: ${formData['origin-country']}`
        )
        setSessionValue(request, 'origin-country', formData['origin-country'])
      }
      if (formData.purpose) {
        setSessionValue(request, 'purpose', formData.purpose)
      }
      if (formData['internal-market-purpose']) {
        setSessionValue(
          request,
          'internal-market-purpose',
          formData['internal-market-purpose']
        )
      }
      if (formData.bcp) {
        setSessionValue(request, 'bcp', formData.bcp)
      }
      if (formData['transport-means-before']) {
        setSessionValue(
          request,
          'transport-means-before',
          formData['transport-means-before']
        )
      }
      if (formData['vehicle-identifier']) {
        setSessionValue(
          request,
          'vehicle-identifier',
          formData['vehicle-identifier']
        )
      }

      // Now collect all session data for notification (including newly saved data)
      const sessionData = {
        'draft-notification-id': getSessionValue(
          request,
          'draft-notification-id'
        ),
        'origin-country': getSessionValue(request, 'origin-country'),
        'commodity-code': getSessionValue(request, 'commodity-code'),
        'commodity-code-details': getSessionValue(
          request,
          'commodity-code-details'
        ),
        'commodity-selected-species': getSessionValue(
          request,
          'commodity-selected-species'
        ),
        purpose: getSessionValue(request, 'purpose'),
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

      // Debug logging - check what's in session
      request.logger.info(
        `Session data after save: ${JSON.stringify(sessionData)}`
      )

      // Build notification DTO from session
      const notificationDto = buildNotificationDto(sessionData)

      // Debug logging - check built notification
      request.logger.info(
        `Built notification DTO: ${JSON.stringify(notificationDto)}`
      )

      // Check if there's any data to save
      if (!hasNotificationData(notificationDto)) {
        request.logger.warn('Save as draft attempted with no data')
        request.logger.warn(
          `Notification DTO: ${JSON.stringify(notificationDto)}`
        )
        return h
          .response({
            success: false,
            message: 'No data to save'
          })
          .code(400)
      }

      try {
        // Call backend to save draft
        const savedNotification = await notificationApi.saveDraft(
          notificationDto,
          traceId
        )

        // Store the notification ID from backend response
        if (savedNotification.id) {
          setSessionValue(
            request,
            'draft-notification-id',
            savedNotification.id
          )
        }

        request.logger.info(
          `Draft notification saved: ${savedNotification.id || 'new'}`
        )

        // Return success response
        return h
          .response({
            success: true,
            message: 'Draft saved successfully',
            notificationId: savedNotification.id
          })
          .code(200)
      } catch (error) {
        request.logger.error(
          `Failed to save draft notification: ${error.message}`
        )
        request.logger.error(`Error stack: ${error.stack}`)
        request.logger.error(`Error cause: ${error.cause}`)

        // Return error response
        return h
          .response({
            success: false,
            message: 'Failed to save draft. Please try again.',
            error: error.message // Include error message for debugging
          })
          .code(500)
      }
    },
    options: {
      // CSRF protection enabled via X-CSRF-Token header
    }
  }
}
