/**
 * View model builders for dashboard
 */

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date like "16 Dec 2025" or "-"
 */
function formatDateForDisplay(dateString) {
  if (!dateString) return '-'

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch (e) {
    return '-'
  }
}

/**
 * Transform a notification into a card-ready object
 * @param {Object} notification - Notification from backend
 * @returns {Object} Notification object with formatted fields for template
 */
function buildNotificationCard(notification) {
  return {
    id: notification.id,
    chedReference: notification.chedReference || notification.id,
    status: notification.status || 'DRAFT',
    commodityDescription: notification.commodity?.description || '-',
    arrivalAtBcp: formatDateForDisplay(notification.arrivalAtBcp),
    consignee: '-', // Placeholder - not in backend model yet
    consignor: '-', // Placeholder - not in backend model yet
    originCountry: notification.originCountry || '-',
    inspection: '-', // Placeholder - not in backend model yet
    createdDate: formatDateForDisplay(notification.created)
  }
}

/**
 * Build dashboard view model with recent notifications
 * @param {Array} notifications - Array of notifications from backend
 * @returns {Object} View model for dashboard template
 */
export function buildDashboardViewModel(notifications = []) {
  // Notifications already sorted and limited by backend
  // Transform each notification for card display
  const notificationCards = notifications.map(buildNotificationCard)

  return {
    pageTitle: 'Dashboard',
    heading: 'Trade Imports Dashboard',
    hasNotifications: notificationCards.length > 0,
    notifications: notificationCards,
    displayedNotifications: notificationCards.length
  }
}
