/**
 * Import journey plugin
 * Registers consignment data collection routes
 */

import { consignmentOriginController } from './controllers/consignment-origin.js'
import { consignmentPurposeController } from './controllers/consignment-purpose.js'
import { commodityCodesController } from './controllers/commodity-codes.js'
import { transportDetailsController } from './controllers/transport.js'
import { reviewController } from './controllers/review.js'
import { confirmationController } from './controllers/confirmation.js'

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

        // Screen 2: Search for commodity codes
        {
          method: 'GET',
          path: '/imports/commodity/codes/toggle',
          ...commodityCodesController.switchTab,
          options: {
            ...commodityCodesController.switchTab.options,
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes',
          ...commodityCodesController.get,
          options: {
            ...commodityCodesController.get.options,
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes/search',
          ...commodityCodesController.search,
          options: {
            ...commodityCodesController.search.options,
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes/species-autofill',
          ...commodityCodesController.speciesSearch,
          options: {
            ...commodityCodesController.speciesSearch.options,
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes/{commodityCode}/search',
          ...commodityCodesController.search,
          options: {
            ...commodityCodesController.search.options,
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/species/search',
          ...commodityCodesController.speciesSearchTree,
          options: {
            ...commodityCodesController.speciesSearchTree.options,
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes/select',
          ...commodityCodesController.select,
          options: {
            ...commodityCodesController.select.options,
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes/save',
          ...commodityCodesController.post,
          options: {
            ...commodityCodesController.post.options,
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes/{parentCode}/first',
          ...commodityCodesController.getFirstChild,
          options: {
            ...commodityCodesController.getFirstChild.options,
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes/{parentCode}/{childCode}/second',
          ...commodityCodesController.getSecondChild,
          options: {
            ...commodityCodesController.getSecondChild.options,
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes/{parentCode}/{firstChild}/{secondChild}/third',
          ...commodityCodesController.getThirdChild,
          options: {
            ...commodityCodesController.getThirdChild.options,
            auth: 'session'
          }
        },
        {
          method: 'GET',
          path: '/import/commodity/codes/{parentCode}/{firstChild}/{secondChild}/{leafCode}/third',
          ...commodityCodesController.getThirdChild,
          options: {
            ...commodityCodesController.getThirdChild.options,
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
        }
      ])
    }
  }
}
