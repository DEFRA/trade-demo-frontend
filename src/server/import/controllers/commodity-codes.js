import { flatten, unflatten } from 'flat'

import { commodityCodeSchema } from '../schemas/commodity-code-schema.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { formatValidationErrors } from '../helpers/validation-helpers.js'
import {
  clearSessionValue,
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import {
  buildCommodityCodeViewModel,
  getCommodityCodeChildNode,
  getCommodityCodesTreeData
} from '../helpers/view-models.js'
import { commodityCodeApi } from '../integration/commodity-code-api-client.js'

export const commodityCodesController = {
  get: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']
      const sessionData = {
        'commodity-code-tree': getSessionValue(request, 'commodity-code-tree'),
        'commodity-code-details': getSessionValue(
          request,
          'commodity-code-details'
        ),
        'commodity-selected-species': unflatten(
          getSessionValue(request, 'commodity-selected-species')
        )
      }

      // tab selection
      const tabs = getSelectedTabDetails(request)

      // if species selection exists
      if (
        sessionData['commodity-code-details'] &&
        sessionData['commodity-selected-species']
      ) {
        let totalAnimals = 0
        let totalPacks = 0

        const speciesLst = Object.values(
          sessionData['commodity-selected-species']
        )
        speciesLst.forEach((species) => {
          totalAnimals += species.noOfAnimals ? Number(species.noOfAnimals) : 0
          totalPacks += species.noOfPacks ? Number(species.noOfPacks) : 0
        })

        const viewModel = {
          action: 'edit',
          tabs,
          commodityCodeDetails: sessionData['commodity-code-details'],
          speciesLst,
          totalAnimals,
          totalPacks
        }

        return h.view('import/templates/commodity-codes/select', viewModel)
      }

      const commodityCodeRoot = await getCommodityCodesTreeData(
        'CVEDA',
        '',
        traceId
      )

      const commodityCodeTree = {}
      commodityCodeTree.treeParent = commodityCodeRoot
      setSessionValue(request, 'commodity-code-tree', commodityCodeTree)

      const viewModel = {
        tabs,
        treeParent: commodityCodeRoot,
        traceId
      }
      return h.view('import/templates/commodity-codes/index', viewModel)
    }
  },

  search: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']
      const commodityCode = request.query['commodity-code']
        ? request.query['commodity-code']
        : request.params['commodityCode']

      // tab selected
      const tabs = getSelectedTabDetails(request)

      // No commodity code
      if (!request.params['commodityCode']) {
        const { error } = commodityCodeSchema.commodityCode.validate(
          request.query,
          {
            abortEarly: false
          }
        )

        if (error) {
          const formattedErrors = error ? formatValidationErrors(error) : null

          const viewModel = {}
          if (formattedErrors) {
            viewModel.errorList = formattedErrors.errorList
            viewModel.formError = {
              text: formattedErrors.errorList[0].text
            }
          }

          viewModel.treeParent = getSessionValue(
            request,
            'commodity-code-tree'
          ).treeParent
          viewModel.tabs = tabs

          return h
            .view('import/templates/commodity-codes/index', viewModel)
            .code(statusCodes.badRequest)
        }
      }

      setSessionValue(request, 'commodity-code', commodityCode)

      const viewModel = await buildCommodityCodeViewModel(
        'CVEDA',
        commodityCode,
        traceId
      )

      setSessionValue(
        request,
        'commodity-code-details',
        viewModel.commodityCodeDetails
      )
      setSessionValue(request, 'commodity-code-species', viewModel.speciesLst)
      setSessionValue(request, 'isCommodityCodeFlowComplete', false)

      return h.view('import/templates/commodity-codes/select', viewModel)
    }
  },

  select: {
    handler: async (request, h) => {
      const sessionData = {
        'commodity-code': getSessionValue(request, 'commodity-code'),
        'commodity-code-details': getSessionValue(
          request,
          'commodity-code-details'
        ),
        'commodity-code-species': getSessionValue(
          request,
          'commodity-code-species'
        )
      }

      // if no species selected
      if (!request.query['species']) {
        const { error } = commodityCodeSchema.species.validate(request.query, {
          abortEarly: false
        })

        if (error) {
          const formattedErrors = error ? formatValidationErrors(error) : null

          const viewModel = {}
          if (formattedErrors) {
            viewModel.errorList = Array.of(formattedErrors.errorList[0])
            viewModel.formError = {
              text: formattedErrors.errorList[0].text
            }
          }

          viewModel.speciesLst = getSessionValue(
            request,
            'commodity-code-species'
          )

          setSessionValue(
            request,
            'commodity-code-species',
            viewModel.speciesLst
          )

          return h.view('import/templates/commodity-codes/select', viewModel)
        }
      }

      const selectedSpeciesLst = []
      const selectedSpecies = Array.isArray(request.query['species'])
        ? request.query['species']
        : [request.query['species']]
      const speciesLst = Object.values(sessionData['commodity-code-species'])
      selectedSpecies.forEach((code) => {
        selectedSpeciesLst.push(
          speciesLst.filter((species) => species.value === code)
        )
      })

      setSessionValue(
        request,
        'commodity-selected-species',
        selectedSpeciesLst.flat()
      )
      setSessionValue(request, 'isCommodityCodeFlowComplete', false)

      return h.redirect('/import/consignment/purpose')
    }
  },

  post: {
    handler(request, h) {
      const sessionData = {
        'commodity-code': getSessionValue(request, 'commodity-code'),
        'commodity-code-details': getSessionValue(
          request,
          'commodity-code-details'
        ),
        'commodity-selected-species': getSessionValue(
          request,
          'commodity-selected-species'
        )
      }

      // get quantities
      const speciesLst = Object.values(
        sessionData['commodity-selected-species']
      )

      speciesLst.forEach((species) => {
        species.noOfAnimals = Number(
          request.query[species.value + '-noOfAnimals']
        )
        species.noOfPacks = Number(request.query[species.value + '-noOfPacks'])
      })

      // If no animals quantities entered
      const invalidQuantity = speciesLst.find(
        (species) => Number(request.query[species.value + '-noOfAnimals']) === 0
      )
      if (invalidQuantity) {
        // invalidQuantity.noOfAnimals = invalidQuantity.noOfAnimals
        //   ? invalidQuantity.noOfAnimals
        //   : 0
        const { error } = commodityCodeSchema.noOfAnimals.validate(
          invalidQuantity,
          {
            abortEarly: false
          }
        )

        if (error) {
          const formattedErrors = error ? formatValidationErrors(error) : null

          const viewModel = {}
          viewModel.action = 'edit'
          if (formattedErrors) {
            viewModel.errorList = Array.of(formattedErrors.errorList[0])
            viewModel.formError = {
              text: formattedErrors.errorList[0].text
            }
          }

          viewModel.commodityCodeDetails = getSessionValue(
            request,
            'commodity-code-details'
          )
          viewModel.speciesLst = getSessionValue(
            request,
            'commodity-selected-species'
          )
          // setSessionValue(request, 'commodity-code-species', viewModel.speciesLst)

          return h.view('import/templates/commodity-codes/select', viewModel)
        }
      }

      setSessionValue(request, 'commodity-code-species', speciesLst.flat())
      clearSessionValue(request, 'commodity-code-tree')
      setSessionValue(request, 'isCommodityCodeFlowComplete', true)

      return h.redirect('/import/consignment/purpose')
    }
  },

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
        'CVEDA',
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
    }
  },

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
        'CVEDA',
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
    }
  },

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
        'CVEDA',
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
    }
  },

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
    }
  },

  speciesSearchTree: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']
      const speciesTextInput = request.query['species-text-input']
        ? request.query['species-text-input']
        : ''

      const tabs = getSelectedTabDetails(request)

      const commodityCodeRoot = await getCommodityCodesTreeData(
        'CVEDA',
        speciesTextInput,
        traceId
      )

      const commodityCodeTree = {}
      commodityCodeTree.treeParent = commodityCodeRoot
      setSessionValue(request, 'commodity-code-tree', commodityCodeTree)

      const viewModel = {
        treeParent: commodityCodeRoot,
        speciesTextInput,
        tabs,
        traceId
      }
      return h.view('import/templates/commodity-codes/index', viewModel)
    }
  },

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
        'CVEDA',
        traceId,
        searchSpecies
      )

      return h.response(response).type('application/json')
    }
  }
}

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

function getSelectedTabName(tabs) {
  return tabs.commoditySearchTab === 'selected'
    ? 'commoditySearchTab'
    : 'speciesSearchTab'
}
