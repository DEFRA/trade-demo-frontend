/**
 * Commodity Search Controller
 * Handles commodity code search and tree navigation
 */
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import {
  buildCommodityCodeViewModel,
  getCommodityCodeChildNode,
  getCommodityCodesTreeData
} from '../helpers/view-models.js'

const CERT_TYPE = 'CVEDA'

/**
 * Helper to get commodity-related session data
 */
function getCommoditySessionKeys(request, keys) {
  return keys.reduce((acc, key) => {
    acc[key] = getSessionValue(request, key)
    return acc
  }, {})
}

export const commoditySearchController = {
  /**
   * GET /import/commodity/codes
   * Shows the commodity search page with search form and tree
   */
  showSearchPage: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']

      // Check if user has already selected species - if so, redirect to quantities
      const hasSelectedSpecies =
        getSessionValue(request, 'commodity-selected-species') &&
        getSessionValue(request, 'commodity-code-details')

      if (hasSelectedSpecies) {
        return h.redirect('/import/commodity/codes/quantities')
      }

      // Load or initialize commodity tree
      let commodityCodeTree = getSessionValue(request, 'commodity-codes-tree')
      if (!commodityCodeTree) {
        commodityCodeTree = await getCommodityCodesTreeData(
          CERT_TYPE,
          traceId,
          {}
        )
        setSessionValue(request, 'commodity-codes-tree', commodityCodeTree)
      }

      // Determine which tab is active
      const activeTab = request.query['tab'] || 'commodity-search'
      const commoditySearchTab =
        activeTab === 'commodity-search' ? 'selected' : 'hidden'
      const speciesSearchTab =
        activeTab === 'species-search' ? 'selected' : 'hidden'

      setSessionValue(request, 'commodity-search-tab', commoditySearchTab)
      setSessionValue(request, 'species-search-tab', speciesSearchTab)

      const viewModel = {
        commoditySearchTab,
        speciesSearchTab,
        commodityCodesParent: commodityCodeTree,
        traceId,
        request,
        sessionData: {}
      }

      return h.view('import/templates/commodity-codes/index', viewModel)
    }
  },

  /**
   * GET /import/commodity/codes/search?commodity-code=X
   * Searches for a commodity code and shows species selection form
   */
  search: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']
      const commodityCode =
        request.query['commodity-code'] || request.params.commodityCode

      if (!commodityCode) {
        return h.redirect('/import/commodity/codes')
      }

      // Save the commodity code
      setSessionValue(request, 'commodity-code', commodityCode)

      const sessionData = getCommoditySessionKeys(request, [
        'commodity-code-details',
        'commodity-type',
        'species-quantities'
      ])

      // Fetch commodity details and species
      const viewModel = await buildCommodityCodeViewModel(
        CERT_TYPE,
        commodityCode,
        traceId,
        request,
        sessionData
      )

      // Check if this commodity has child nodes (tree navigation)
      if (request.params.commodityCode) {
        const commodityCodeNodeDetails = await getCommodityCodeChildNode(
          CERT_TYPE,
          request.params.commodityCode,
          traceId,
          sessionData
        )

        if (commodityCodeNodeDetails.length > 0) {
          const parentCode = request.query['parent-code']
          setSessionValue(
            request,
            'commodity-codes-child',
            commodityCodeNodeDetails
          )
          return h.redirect(
            `/import/commodity/codes/${commodityCode}/parent?parent-code=${parentCode}`
          )
        }
      }

      // Save commodity details to session
      setSessionValue(
        request,
        'commodity-code-details',
        viewModel.commodityCodeDetails
      )

      // Store description separately for easy access
      if (
        viewModel.commodityCodeDetails &&
        viewModel.commodityCodeDetails.length > 0
      ) {
        setSessionValue(
          request,
          'commodity-code-description',
          viewModel.commodityCodeDetails[0].description
        )
      }

      // Save species list for selection
      setSessionValue(request, 'commodity-code-species', viewModel.speciesLst)

      return h.view('import/templates/commodity-codes/select', viewModel)
    }
  },

  /**
   * GET /import/commodity/codes/{parentCode}/parent?parent-code=X
   * Navigates commodity tree hierarchy
   */
  tree: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']

      const sessionData = getCommoditySessionKeys(request, [
        'commodity-code',
        'commodity-codes',
        'commodity-code-details',
        'commodity-selected-species',
        'commodity-codes-tree'
      ])

      const parentCode =
        request.query['parent-code'] || request.params.parentCode

      // Get child nodes for this parent
      const commodityCodesChild = await getCommodityCodeChildNode(
        CERT_TYPE,
        parentCode,
        traceId,
        sessionData
      )

      // Get full tree and filter to current parent
      const tmpCommodityCodesParent = await getCommodityCodesTreeData(
        CERT_TYPE,
        traceId,
        sessionData
      )
      const commodityCodesParent = tmpCommodityCodesParent.filter(
        (commodity) => commodity.code === parentCode
      )

      // Build child node structure
      const childRoot = commodityCodesChild.filter(
        (commodity) =>
          request.params.parentCode === commodity.code &&
          commodity.parent === true
      )

      if (childRoot.length > 0) {
        const childNodes = getSessionValue(request, 'commodity-codes-child')
        childRoot.children = childNodes
      }

      // Restore tab state
      const commoditySearchTab = getSessionValue(
        request,
        'commodity-search-tab'
      )
      const speciesSearchTab = getSessionValue(request, 'species-search-tab')

      commodityCodesParent.commodityCodesChild =
        childRoot.length > 0 ? childRoot : commodityCodesChild

      const viewModel = {
        commodityCodesParent,
        commoditySearchTab,
        speciesSearchTab,
        traceId,
        request,
        sessionData
      }

      return h.view('import/templates/commodity-codes/index', viewModel)
    }
  }
}
