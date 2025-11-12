import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'

export const confirmationController = {
  get: {
    handler(request, h) {
      // Get CHED reference from session
      const chedReference = getSessionValue(request, 'chedReference')

      // Guard: redirect to start if no reference in session
      if (!chedReference) {
        return h.redirect('/import/consignment/origin')
      }

      // Clear the CHED reference from session after displaying
      setSessionValue(request, 'chedReference', '')

      const viewModel = {
        pageTitle: 'Import notification submitted',
        heading: 'Import notification submitted',
        chedReference
      }

      return h.view('import/templates/confirmation/index', viewModel)
    },
    options: {}
  }
}
