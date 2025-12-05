import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'

export const confirmationController = {
  get: {
    handler(request, h) {
      // Get notification ID from session
      const notificationId = getSessionValue(request, 'notification-id')

      // Guard: redirect to start if no notification ID in session
      if (!notificationId) {
        return h.redirect('/import/consignment/origin')
      }

      // Clear the notification ID from session after displaying
      setSessionValue(request, 'notification-id', '')

      const viewModel = {
        pageTitle: 'Import notification submitted',
        heading: 'Import notification submitted',
        notificationId
      }

      return h.view('import/templates/confirmation/index', viewModel)
    },
    options: {}
  }
}
