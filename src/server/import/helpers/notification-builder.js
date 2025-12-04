/**
 * Notification Builder
 *
 * Transforms session page model into NotificationDto structure for backend API
 * Maps flat session keys to nested notification object
 */

/**
 * Build NotificationDto from session data
 * @param {Object} sessionData - Session data containing page model
 * @returns {Object} NotificationDto formatted for backend PUT /notifications
 */
export function buildNotificationDto(sessionData) {
  const notification = {
    id: sessionData['draft-notification-id'] || null,
    chedReference: null, // Nullable for drafts - backend handles generation
    originCountry: sessionData['origin-country'] || null,
    commodity: null,
    importReason: sessionData.purpose || null,
    internalMarketPurpose: sessionData['internal-market-purpose'] || null,
    transport: null
  }

  // Build Commodity object if commodity data exists
  if (sessionData['commodity-code']) {
    notification.commodity = {
      code: sessionData['commodity-code'],
      description: sessionData['commodity-code-description'] || null,
      species: []
    }

    // Map selected species to backend structure
    const selectedSpecies = sessionData['commodity-selected-species'] || []
    notification.commodity.species = selectedSpecies.map((species) => ({
      name: species.text || null, // Scientific (Latin) name
      code: species.value || null, // Short code (e.g., "BOT")
      noOfAnimals: species.noOfAnimals
        ? parseInt(species.noOfAnimals, 10)
        : null,
      noOfPackages: species.noOfPacks ? parseInt(species.noOfPacks, 10) : null
    }))
  }

  // Build Transport object if transport data exists
  if (
    sessionData.bcp ||
    sessionData['transport-means-before'] ||
    sessionData['vehicle-identifier']
  ) {
    // Extract BCP code from full string (format: "Name - CODE")
    let bcpCode = null
    if (sessionData.bcp) {
      const bcpParts = sessionData.bcp.split(' - ')
      bcpCode = bcpParts.length > 1 ? bcpParts[1] : bcpParts[0]
    }

    notification.transport = {
      bcpCode,
      transportToBcp: sessionData['transport-means-before'] || null,
      vehicleId: sessionData['vehicle-identifier'] || null
    }
  }

  return notification
}

/**
 * Check if notification has any saveable data
 * @param {Object} notification - NotificationDto
 * @returns {boolean} True if notification has at least one non-null field (excluding id)
 */
export function hasNotificationData(notification) {
  return !!(
    notification.originCountry ||
    notification.commodity ||
    notification.importReason ||
    notification.internalMarketPurpose ||
    notification.transport
  )
}
