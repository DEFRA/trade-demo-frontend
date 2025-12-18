/**
 * Amend Controller
 *
 * Loads an existing notification into the session for editing
 */

import { notificationApi } from '../../common/helpers/api-client.js'
import { setSessionValue } from '../../common/helpers/session-helpers.js'

/**
 * Map notification DTO back to flat session keys
 * (Reverse of buildNotificationDto)
 */
function mapNotificationToSession(notification) {
  const sessionData = {}

  // Basic fields
  if (notification.id) {
    sessionData['notification-id'] = notification.id
  }

  if (notification.originCountry) {
    sessionData['origin-country'] = notification.originCountry
  }

  // Commodity fields
  if (notification.commodity) {
    const { commodity } = notification

    if (commodity.code) {
      sessionData['commodity-code'] = commodity.code
    }

    if (commodity.description) {
      sessionData['commodity-code-description'] = commodity.description
    }

    // Store full commodity details for review page
    sessionData['commodity-code-details'] = {
      code: commodity.code,
      description: commodity.description,
      type: commodity.type
    }

    // Map species back to session format
    if (commodity.species && commodity.species.length > 0) {
      sessionData['commodity-selected-species'] = commodity.species.map(
        (species) => ({
          text: species.name,
          value: species.code || species.name,
          noOfAnimals: species.noOfAnimals,
          noOfPacks: species.noOfPackages
        })
      )
    }

    if (commodity.type) {
      sessionData['commodity-type'] = commodity.type
    }
  }

  // Purpose fields
  if (notification.importReason) {
    sessionData.purpose = notification.importReason
  }

  if (notification.internalMarketPurpose) {
    sessionData['internal-market-purpose'] = notification.internalMarketPurpose
  }

  // Transport fields
  if (notification.transport) {
    const { transport } = notification

    if (transport.bcpCode) {
      sessionData.bcp = transport.bcpCode
    }

    if (transport.transportToBcp) {
      sessionData['transport-means-before'] = transport.transportToBcp
    }

    if (transport.vehicleId) {
      sessionData['vehicle-identifier'] = transport.vehicleId
    }
  }

  return sessionData
}

/**
 * Amend Controller
 */
export const amendController = {
  /**
   * GET /import/amend/{id}
   * Loads a notification by ID and populates the session
   */
  handler: {
    async handler(request, h) {
      const { id } = request.params
      const traceId = request.headers['x-cdp-request-id'] || 'no-trace-id'

      try {
        // Fetch notification from backend
        const notification = await notificationApi.findById(id, traceId)

        // Map notification data back to session keys
        const sessionData = mapNotificationToSession(notification)

        // Populate session with all fields
        for (const [key, value] of Object.entries(sessionData)) {
          setSessionValue(request, key, value)
        }

        // Set flag to indicate this is an amend operation
        setSessionValue(request, 'isAmending', true)

        // Redirect to review page
        return h.redirect('/import/review')
      } catch (error) {
        request.logger.error(
          `Failed to load notification ${id} for amending:`,
          error
        )

        // Redirect to dashboard with error
        return h.redirect('/dashboard')
      }
    }
  }
}
