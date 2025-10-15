/**
 * Start page controller
 * Implements GDS start page pattern
 */

export const startController = {
  handler(_request, h) {
    return h.view('start/index', {
      pageTitle: 'Manage Examples',
      heading: 'Manage Examples'
    })
  }
}
