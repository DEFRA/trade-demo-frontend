/**
 * Commodity Selection Controller
 * Handles species selection from commodity code search results
 */
import {
  getSessionValue,
  setSessionValue,
  clearSessionValue
} from '../../common/helpers/session-helpers.js'

export const commoditySelectionController = {
  /**
   * GET /import/commodity/codes/species/back
   * Clears commodity selection data and returns to commodity search
   */
  backToCommoditySearch: {
    handler: (request, h) => {
      // Clear all commodity-related session data
      clearSessionValue(request, 'commodity-selected-species')
      clearSessionValue(request, 'commodity-code-details')
      clearSessionValue(request, 'commodity-code-species')
      clearSessionValue(request, 'commodity-code')
      clearSessionValue(request, 'commodity-code-description')

      return h.redirect('/import/commodity/codes')
    }
  },

  /**
   * GET /import/commodity/codes/species
   * Shows species selection form from session data
   */
  showSpeciesSelection: {
    handler: (request, h) => {
      const commodityCodeDetails = getSessionValue(
        request,
        'commodity-code-details'
      )
      const speciesLst = getSessionValue(request, 'commodity-code-species')
      const commodityTypes = getSessionValue(request, 'commodity-type')

      // Guard: ensure commodity has been searched
      if (!commodityCodeDetails || !speciesLst) {
        return h.redirect('/import/commodity/codes')
      }

      // Clear selected species so user can make a new selection
      clearSessionValue(request, 'commodity-selected-species')

      const viewModel = {
        commodityCodeDetails,
        speciesLst,
        commodityTypes: commodityTypes ? [{ text: commodityTypes }] : [],
        isChecked: false
      }

      return h.view('import/templates/commodity-codes/select', viewModel)
    }
  },

  /**
   * GET /import/commodity/codes/select?species=X&species=Y&commodityType=Z
   * Processes selected species and redirects to quantities page
   */
  saveSelectedSpecies: {
    handler: (request, h) => {
      const commodityType = request.query['commodityType']
      const speciesParam = request.query['species']

      if (!speciesParam) {
        // No species selected, redirect back to search
        return h.redirect('/import/commodity/codes')
      }

      // Get available species from session
      const availableSpecies = getSessionValue(
        request,
        'commodity-code-species'
      )

      if (!availableSpecies) {
        // No species available in session, redirect back to search
        return h.redirect('/import/commodity/codes')
      }

      // Normalize species parameter to array
      const selectedSpeciesCodes = Array.isArray(speciesParam)
        ? speciesParam
        : [speciesParam]

      // Find full species objects from available species list
      const selectedSpecies = selectedSpeciesCodes
        .map((code) =>
          availableSpecies.find((species) => species.value === code)
        )
        .filter((species) => species !== undefined)

      // Save commodity type and selected species to session
      if (commodityType) {
        setSessionValue(request, 'commodity-type', commodityType)
      }

      setSessionValue(request, 'commodity-selected-species', selectedSpecies)

      // Redirect to quantities form
      return h.redirect('/import/commodity/codes/quantities')
    }
  }
}
