/**
 * Authentication State Management
 *
 * Utilities for managing authentication state in session storage.
 * Used to track redirect paths during OAuth flow.
 */

/**
 * Save the path to redirect to after successful authentication
 * @param {Object} request - Hapi request object
 * @param {string} path - Path to redirect to after login
 */
export function saveRedirectPath(request, path) {
  request.yar.set('redirectPath', path)
}

/**
 * Get the saved redirect path and clear it from session
 * @param {Object} request - Hapi request object
 * @returns {string} Path to redirect to (defaults to '/')
 */
export function getRedirectPath(request) {
  const path = request.yar.get('redirectPath') || '/'
  request.yar.clear('redirectPath')
  return path
}
