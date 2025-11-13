/**
 * Start page controller
 * Implements GDS start page pattern
 */

export const startController = {
  handler(_request, h) {
    return h.view('start/index', {
      pageTitle: 'CDP Import Notifications',
      heading: 'CDP Import Notifications'
    })
  }
}
