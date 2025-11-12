/**
 * Import journey plugin
 * Registers consignment data collection routes
 */

import { consignmentOriginController } from './controllers/consignment-origin.js'
import { consignmentPurposeController } from './controllers/consignment-purpose.js'

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

        // Screen 2: Purpose of import
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
        }
      ])
    }
  }
}
