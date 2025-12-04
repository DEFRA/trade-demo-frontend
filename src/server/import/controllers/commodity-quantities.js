/**
 * Commodity Quantities Controller
 * Handles quantity entry for selected species
 */
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'

/**
 * Calculate totals for animals and packs across all species
 */
function calculateTotals(speciesList) {
  let totalAnimals = 0
  let totalPacks = 0

  speciesList.forEach((species) => {
    totalAnimals += species.noOfAnimals ? Number(species.noOfAnimals) : 0
    totalPacks += species.noOfPacks ? Number(species.noOfPacks) : 0
  })

  return { totalAnimals, totalPacks }
}

export const commodityQuantitiesController = {
  /**
   * GET /import/commodity/codes/quantities
   * Shows the quantities entry form for selected species
   */
  showQuantitiesForm: {
    handler: (request, h) => {
      const commodityCodeDetails = getSessionValue(
        request,
        'commodity-code-details'
      )
      const selectedSpecies = getSessionValue(
        request,
        'commodity-selected-species'
      )

      // Guard: ensure species have been selected
      if (!commodityCodeDetails || !selectedSpecies) {
        return h.redirect('/import/commodity/codes')
      }

      // Calculate totals
      const { totalAnimals, totalPacks } = calculateTotals(selectedSpecies)

      const viewModel = {
        action: 'edit',
        commodityCodeDetails,
        speciesLst: selectedSpecies,
        totalAnimals,
        totalPacks
      }

      return h.view('import/templates/commodity-codes/select', viewModel)
    }
  },

  /**
   * GET /import/commodity/codes/quantities/save
   * Saves quantities from form and redirects to next step
   */
  saveQuantities: {
    handler: (request, h) => {
      const selectedSpecies = getSessionValue(
        request,
        'commodity-selected-species'
      )

      // Guard: ensure species exist
      if (!selectedSpecies) {
        return h.redirect('/import/commodity/codes')
      }

      // Extract quantities from query parameters and update species
      selectedSpecies.forEach((species) => {
        const noOfAnimalsKey = `${species.value}-noOfAnimals`
        const noOfPacksKey = `${species.value}-noOfPacks`

        if (request.query[noOfAnimalsKey]) {
          species.noOfAnimals = request.query[noOfAnimalsKey]
        }
        if (request.query[noOfPacksKey]) {
          species.noOfPacks = request.query[noOfPacksKey]
        }
      })

      // Save updated species back to session
      setSessionValue(request, 'commodity-selected-species', selectedSpecies)

      // Redirect to next step in journey
      return h.redirect('/import/consignment/purpose')
    }
  }
}
