/**
 * Commodity Search Controller
 * Handles commodity code search and tree navigation
 */
import { flatten, unflatten } from 'flat'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import {
  buildCommodityCodeViewModel,
  getCommodityCodeChildNode,
  getCommodityCodesTreeData
} from '../helpers/view-models.js'
import { commodityCodeApi } from '../integration/commodity-code-api-client.js'
import { commodityCodeSchema } from '../schemas/commodity-code-schema.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { formatValidationErrors } from '../helpers/validation-helpers.js'

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
      const sessionData = getSessionValue(request, 'commodity-code-tree')
      let treeParent

      if (!sessionData) {
        // First time loading - fetch from API
        treeParent = await getCommodityCodesTreeData(
          CERT_TYPE,
          '',
          traceId,
          request
        )
        // Store in session with treeParent structure for tree navigation handlers
        const commodityCodeTree = {}
        commodityCodeTree.treeParent = treeParent
        setSessionValue(
          request,
          'commodity-code-tree',
          flatten(commodityCodeTree)
        )
      } else {
        // Loading from session - unflatten it
        const commodityCodeTree = unflatten(sessionData)
        treeParent = commodityCodeTree.treeParent
      }

      // Determine which tab is active using getSelectedTabDetails helper
      const tabs = getSelectedTabDetails(request)

      setSessionValue(request, 'commodity-search-tab', tabs.commoditySearchTab)
      setSessionValue(request, 'species-search-tab', tabs.speciesSearchTab)

      const viewModel = {
        tabs,
        treeParent,
        traceId
      }

      // Check for error query parameter
      if (request.query.error === 'commodity-not-found') {
        viewModel.errorBanner = {
          text: 'Commodity code could not be found. Please try another code.',
          type: 'error'
        }
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

      // Get tab details
      const tabs = getSelectedTabDetails(request)

      // Validate commodity code input from search form (not tree navigation)
      if (!request.params.commodityCode) {
        const { error } = commodityCodeSchema.commodityCode.validate(
          request.query,
          {
            abortEarly: false
          }
        )

        if (error) {
          const formattedErrors = error ? formatValidationErrors(error) : null

          // Load tree from session to display with error
          const sessionData = getSessionValue(request, 'commodity-code-tree')
          let treeParent = []
          if (sessionData) {
            const commodityCodeTree = unflatten(sessionData)
            treeParent = commodityCodeTree.treeParent || []
          }

          const viewModel = {
            tabs,
            treeParent
          }

          if (formattedErrors) {
            viewModel.errorList = formattedErrors.errorList
            viewModel.formError = {
              text: formattedErrors.errorList[0].text
            }
          }

          return h
            .view('import/templates/commodity-codes/index', viewModel)
            .code(statusCodes.badRequest)
        }
      }

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

      // Check if commodity code was found and has valid data
      if (
        !viewModel.commodityCodeDetails ||
        viewModel.commodityCodeDetails.length === 0 ||
        !viewModel.speciesLst ||
        viewModel.speciesLst.length === 0
      ) {
        // Commodity code not found or has no species - redirect back with error
        const tabParam =
          tabs.commoditySearchTab === 'selected'
            ? 'commoditySearchTab'
            : 'speciesSearchTab'
        return h.redirect(
          `/import/commodity/codes?error=commodity-not-found&tab=${tabParam}`
        )
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
        'commodity-code-tree'
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
        '',
        traceId,
        request
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
  },

  /**
   * GET /import/commodity/codes/{parentCode}/first
   * Navigate to first level of commodity tree
   */
  getFirstChild: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']
      const sessionData = {
        'commodity-code-tree': unflatten(
          getSessionValue(request, 'commodity-code-tree')
        )
      }

      // tab selected
      const tabs = getSelectedTabDetails(request)

      const parentCode = request.params['parentCode']
      const commodityCodeTree = sessionData['commodity-code-tree']

      // filter parent
      const treeParent = commodityCodeTree.treeParent.filter(
        (commodity) => commodity.code === parentCode
      )

      treeParent.firstChild = await getCommodityCodeChildNode(
        CERT_TYPE,
        parentCode,
        traceId,
        request
      )

      const updatedCommodityCodeTree = {}
      updatedCommodityCodeTree.treeParent = treeParent
      setSessionValue(
        request,
        'commodity-code-tree',
        flatten(updatedCommodityCodeTree)
      )
      const viewModel = {
        treeParent,
        tabs,
        traceId
      }
      return h.view('import/templates/commodity-codes/index', viewModel)
    },
    options: {}
  },

  /**
   * GET /import/commodity/codes/{parentCode}/{childCode}/second
   * Navigate to second level of commodity tree
   */
  getSecondChild: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']
      const sessionData = {
        'commodity-code-tree': unflatten(
          getSessionValue(request, 'commodity-code-tree')
        )
      }

      // tab selected
      const tabs = getSelectedTabDetails(request)
      const tabSelected = getSelectedTabName(tabs)

      const commodityCode = request.params['childCode']
      const commodityCodesChild = await getCommodityCodeChildNode(
        CERT_TYPE,
        commodityCode,
        traceId,
        sessionData
      )

      if (Number(commodityCodesChild.length) === 0) {
        return h.redirect(
          `/import/commodity/codes/${commodityCode}/search?tab=${tabSelected}`
        )
      }

      const parentCode = request.params['parentCode']

      // filter first child
      const commodityCodeTree = sessionData['commodity-code-tree']

      const treeParent = commodityCodeTree.treeParent
      const firstChild = treeParent.firstChild.filter(
        (commodity) =>
          commodity.parentCode === parentCode &&
          commodity.code === commodityCode &&
          commodity.parent === true
      )

      if (firstChild.length > 0) {
        treeParent.firstChild = firstChild
        firstChild.secondChild = commodityCodesChild
      } else {
        const childCode = request.params.childCode
        const selectedTabName = getSelectedTabName(tabs)
        return h.redirect(
          `/import/commodity/codes/${parentCode}/${childCode}/search?tab=${selectedTabName}`
        )
      }

      const updateCommodityCodeTree = {}
      updateCommodityCodeTree.treeParent = treeParent
      setSessionValue(
        request,
        'commodity-code-tree',
        flatten(updateCommodityCodeTree)
      )
      const viewModel = {
        treeParent,
        tabs,
        traceId
      }

      return h.view('import/templates/commodity-codes/index', viewModel)
    },
    options: {}
  },

  /**
   * GET /import/commodity/codes/{parentCode}/{firstChild}/{secondChild}/third
   * Navigate to third level of commodity tree
   */
  getThirdChild: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']
      const sessionData = {
        'commodity-code-tree': unflatten(
          getSessionValue(request, 'commodity-code-tree')
        )
      }

      // tab selected
      const tabs = getSelectedTabDetails(request)
      const selectedTabName = getSelectedTabName(tabs)

      if (request.params['leafCode']) {
        const commodityCode = request.params['leafCode']
        return h.redirect(
          `/import/commodity/codes/${commodityCode}/search?tab=${selectedTabName}`
        )
      }

      const leafCommodityCode = request.params['secondChild']
      const leafCommodityCodeNodes = await getCommodityCodeChildNode(
        CERT_TYPE,
        leafCommodityCode,
        traceId,
        sessionData
      )

      // if no down child are present
      if (leafCommodityCodeNodes.length === 0) {
        return h.redirect(
          `/import/commodity/codes/${leafCommodityCode}/search?tab=${selectedTabName}`
        )
      }

      const treeParent = sessionData['commodity-code-tree'].treeParent

      // filter second child
      const secondChildCommodityCode = request.params['secondChild']
      const secondChild = treeParent.firstChild.secondChild.filter(
        (commodity) => commodity.code === secondChildCommodityCode
      )

      secondChild.leaf = leafCommodityCodeNodes
      treeParent.firstChild.secondChild = secondChild

      const updatedCommodityCodeTree = {}
      updatedCommodityCodeTree.treeParent = treeParent
      setSessionValue(
        request,
        'commodity-code-tree',
        flatten(updatedCommodityCodeTree)
      )

      const viewModel = {
        treeParent,
        tabs,
        traceId
      }

      return h.view('import/templates/commodity-codes/index', viewModel)
    },
    options: {}
  },

  /**
   * GET /imports/commodity/codes/toggle?tab=X
   * Switch between commodity search and species search tabs
   */
  switchTab: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']
      const sessionData = {
        'commodity-code-tree': unflatten(
          getSessionValue(request, 'commodity-code-tree')
        )
      }

      // tab selected
      const tabs = getSelectedTabDetails(request)

      const commodityCodeTree = sessionData['commodity-code-tree']

      const viewModel = {
        tabs,
        treeParent: commodityCodeTree.treeParent,
        traceId
      }

      return h.view('import/templates/commodity-codes/index', viewModel)
    },
    options: {}
  },

  /**
   * GET /import/commodity/species/search?species-text-input=X
   * Search commodity tree by species name
   */
  speciesSearchTree: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']
      const speciesTextInput = request.query['species-text-input']
        ? request.query['species-text-input']
        : ''

      const tabs = getSelectedTabDetails(request)

      const commodityCodeRoot = await getCommodityCodesTreeData(
        CERT_TYPE,
        speciesTextInput,
        traceId,
        request
      )

      const commodityCodeTree = {}
      commodityCodeTree.treeParent = commodityCodeRoot
      setSessionValue(
        request,
        'commodity-code-tree',
        flatten(commodityCodeTree)
      )

      const viewModel = {
        treeParent: commodityCodeRoot,
        speciesTextInput,
        tabs,
        traceId
      }
      return h.view('import/templates/commodity-codes/index', viewModel)
    },
    options: {}
  },

  /**
   * GET /import/commodity/codes/species-autofill?filter=X
   * Autocomplete API endpoint for species suggestions
   */
  speciesSearch: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']
      const sessionData = {
        'commodity-code-tree': unflatten(
          getSessionValue(request, 'commodity-code-tree')
        )
      }

      const commodityCodeTree = {}
      commodityCodeTree.treeParent = sessionData['commodity-code-tree']

      const searchSpecies = request.query['filter']
      const response = await commodityCodeApi.getSpecies(
        CERT_TYPE,
        traceId,
        searchSpecies
      )

      return h.response(response).type('application/json')
    },
    options: {}
  }
}

/**
 * Helper function to determine selected tab details from query params
 */
function getSelectedTabDetails(request) {
  let commoditySearchTab, speciesSearchTab
  if (!request.query['tab']) {
    commoditySearchTab = 'selected'
    speciesSearchTab = 'hidden'
  } else {
    commoditySearchTab =
      request.query['tab'] === 'commoditySearchTab' ? 'selected' : 'hidden'
    speciesSearchTab =
      request.query['tab'] === 'speciesSearchTab' ? 'selected' : 'hidden'
  }

  return {
    commoditySearchTab,
    speciesSearchTab
  }
}

/**
 * Helper function to get the selected tab name
 */
function getSelectedTabName(tabs) {
  return tabs.commoditySearchTab === 'selected'
    ? 'commoditySearchTab'
    : 'speciesSearchTab'
}
