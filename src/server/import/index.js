/**
 * Import journey plugin
 * Registers consignment data collection routes
 */

import { consignmentOriginController } from './controllers/consignment-origin.js'
import { consignmentPurposeController } from './controllers/consignment-purpose.js'
import { commoditySearchController } from './controllers/commodity-search.js'
import { commoditySelectionController } from './controllers/commodity-selection.js'
import { commodityQuantitiesController } from './controllers/commodity-quantities.js'
import { transportDetailsController } from './controllers/transport.js'
import { reviewController } from './controllers/review.js'
import { confirmationController } from './controllers/confirmation.js'
import { saveAsDraftController } from './controllers/save-as-draft.js'
import { amendController } from './controllers/amend.js'

export const importJourney = {
  plugin: {
    name: 'import-journey',
    register(server) {
      server.route([
        // Screen 1: Origin country selection
        {
          method: 'GET',
          path: '/import/consignment/origin',
          ...consignmentOriginController.get,
          options: {
            ...consignmentOriginController.get.options,
            auth: 'session'
          }
        },
        {
          method: 'POST',
          path: '/import/consignment/origin',
          ...consignmentOriginController.post,
          options: {
            ...consignmentOriginController.post.options,
            auth: 'session'
          }
        },

        // Screen 2: Commodity code search, selection, and quantities
        // 2a. Show search page
        {
          method: 'GET',
          path: '/imports/commodity/codes/toggle',
          ...commoditySearchController.switchTab,
          options: {
            ...commoditySearchController.switchTab.options,
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes',
          ...commoditySearchController.showSearchPage,
          options: {
            auth: 'session'
          }
        },
        // 2b. Search for commodity and show species selection
        {
          method: 'GET',
          path: '/import/commodity/codes/search',
          ...commoditySearchController.search,
          options: {
            auth: 'session'
          }
        },
        // 2c. Tree navigation - search by child code
        {
          method: 'GET',
          path: '/import/commodity/codes/species-autofill',
          ...commoditySearchController.speciesSearch,
          options: {
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes/{commodityCode}/child',
          ...commoditySearchController.search,
          options: {
            auth: 'session'
          }
        },
        // 2d. Tree navigation - parent hierarchy
        {
          method: 'GET',
          path: '/import/commodity/codes/{commodityCode}/search',
          ...commoditySearchController.search,
          options: {
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/species/search',
          ...commoditySearchController.speciesSearchTree,
          options: {
            ...commoditySearchController.speciesSearchTree.options,
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes/{parentCode}/parent',
          ...commoditySearchController.tree,
          options: {
            auth: 'session'
          }
        },
        // 2e. Back to commodity search (clears selection)
        {
          method: 'GET',
          path: '/import/commodity/codes/species/back',
          ...commoditySelectionController.backToCommoditySearch,
          options: {
            auth: 'session'
          }
        },
        // 2f. Show species selection from session (for back navigation)
        {
          method: 'GET',
          path: '/import/commodity/codes/species',
          ...commoditySelectionController.showSpeciesSelection,
          options: {
            auth: 'session'
          }
        },
        // 2g. Save selected species
        {
          method: 'GET',
          path: '/import/commodity/codes/select',
          ...commoditySelectionController.saveSelectedSpecies,
          options: {
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes/{parentCode}/first',
          ...commoditySearchController.getFirstChild,
          options: {
            ...commoditySearchController.getFirstChild.options,
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes/{parentCode}/{childCode}/second',
          ...commoditySearchController.getSecondChild,
          options: {
            ...commoditySearchController.getSecondChild.options,
            auth: 'session'
          }
        },
        // 2h. Show quantities entry form
        {
          method: 'GET',
          path: '/import/commodity/codes/quantities',
          ...commodityQuantitiesController.showQuantitiesForm,
          options: {
            auth: 'session'
          }
        },
        // 2i. Save quantities and continue
        {
          method: 'GET',
          path: '/import/commodity/codes/{parentCode}/{firstChild}/{secondChild}/third',
          ...commoditySearchController.getThirdChild,
          options: {
            ...commoditySearchController.getThirdChild.options,
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes/quantities/save',
          ...commodityQuantitiesController.saveQuantities,
          options: {
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes/{parentCode}/{firstChild}/{secondChild}/{leafCode}/third',
          ...commoditySearchController.getThirdChild,
          options: {
            ...commoditySearchController.getThirdChild.options,
            auth: 'session'
          }
        },

        // Screen 3: Purpose of import
        {
          method: 'GET',
          path: '/import/consignment/purpose',
          ...consignmentPurposeController.get,
          options: {
            ...consignmentPurposeController.get.options,
            auth: 'session'
          }
        },
        {
          method: 'POST',
          path: '/import/consignment/purpose',
          ...consignmentPurposeController.post,
          options: {
            ...consignmentPurposeController.post.options,
            auth: 'session'
          }
        },

        // Screen 4: Transportation BCP & PoE details
        {
          method: 'GET',
          path: '/import/transport',
          ...transportDetailsController.get,
          options: {
            ...transportDetailsController.get.options,
            auth: 'session'
          }
        },
        {
          method: 'POST',
          path: '/import/transport',
          ...transportDetailsController.post,
          options: {
            ...transportDetailsController.post.options,
            auth: 'session'
          }
        },

        // BCP Autocomplete API
        {
          method: 'GET',
          path: '/import/transport/api',
          ...transportDetailsController.api,
          options: {
            auth: 'session'
          }
        },

        // Screen 5: Review and submit
        {
          method: 'GET',
          path: '/import/review',
          ...reviewController.get,
          options: {
            ...reviewController.get.options,
            auth: 'session'
          }
        },
        {
          method: 'POST',
          path: '/import/review',
          ...reviewController.post,
          options: {
            ...reviewController.post.options,
            auth: 'session'
          }
        },

        // Screen 6: Confirmation
        {
          method: 'GET',
          path: '/import/confirmation',
          ...confirmationController.get,
          options: {
            ...confirmationController.get.options,
            auth: 'session'
          }
        },

        // Save as Draft - available from any page in journey
        {
          method: 'POST',
          path: '/import/save-as-draft',
          ...saveAsDraftController.post,
          options: {
            ...saveAsDraftController.post.options,
            auth: 'session',
            plugins: {
              crumb: {
                restful: true // Enable header-based CSRF validation for this AJAX endpoint
              }
            }
          }
        },

        // Amend - load existing notification for editing
        {
          method: 'GET',
          path: '/import/amend/{id}',
          ...amendController.handler,
          options: {
            auth: 'session'
          }
        }
      ])
    }
  }
}
