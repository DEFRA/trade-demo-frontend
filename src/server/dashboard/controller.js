/**
 * Dashboard Controller
 *
 * Entry point to the trade imports journey - requires authentication.
 * Displays import journey options.
 *
 * @see src/server/dashboard/index.js for route registration
 * @see src/server/auth/controller.js for session creation
 */

/**
 * Dashboard controller
 */
export const dashboardController = {
  /**
   * GET /dashboard
   */
  async handler(request, h) {
    return h.view('dashboard/index', {
      pageTitle: 'Dashboard',
      heading: 'Trade Imports Dashboard'
    })
  }
}
