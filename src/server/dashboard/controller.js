/**
 * Dashboard Controller
 *
 * Entry point to the trade imports journey - requires authentication.
 * Displays import journey options and recent notifications.
 *
 * @see src/server/dashboard/index.js for route registration
 * @see src/server/auth/controller.js for session creation
 */

import { notificationApi } from '../common/helpers/api-client.js'
import { buildDashboardViewModel } from './helpers/view-models.js'
import { config } from '../../config/config.js'

/**
 * Sort notifications by created date descending (newest first)
 * @param {Array} notifications - Array of notifications
 * @returns {Array} Sorted notifications
 */
function sortByCreatedDesc(notifications) {
  return [...notifications].sort((a, b) => {
    const dateA = new Date(a.created || 0)
    const dateB = new Date(b.created || 0)
    return dateB - dateA // Descending order (newest first)
  })
}

/**
 * Dashboard controller
 */
export const dashboardController = {
  /**
   * GET /dashboard
   */
  async handler(request, h) {
    const traceId = request.headers['x-cdp-request-id'] || 'no-trace-id'
    const limit = config.get('dashboardRecordsLimit')

    try {
      // Fetch all notifications from backend
      const allNotifications = await notificationApi.findAll(traceId)

      // Sort by created date (newest first) and limit in frontend
      const sortedNotifications = sortByCreatedDesc(allNotifications)
      const limitedNotifications = sortedNotifications.slice(0, limit)

      // Build view model
      const viewModel = buildDashboardViewModel(limitedNotifications)

      return h.view('dashboard/index', viewModel)
    } catch (error) {
      // Log error but don't crash - show empty state
      request.logger.error(
        'Failed to fetch notifications for dashboard:',
        error
      )

      // Return empty state view model
      const viewModel = buildDashboardViewModel([])
      return h.view('dashboard/index', viewModel)
    }
  }
}
