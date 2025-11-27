import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import {
  buildCommodityCodeViewModel,
  getCommodityCodeChildNode,
  getCommodityCodesTreeData
} from '../helpers/view-models.js'

export const commodityCodesController = {
  get: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']
      const sessionData = {
        'commodity-codes': getSessionValue(request, 'commodity-codes'),
        'commodity-code-details': getSessionValue(
          request,
          'commodity-code-details'
        ),
        'commodity-selected-species': getSessionValue(
          request,
          'commodity-selected-species'
        ),
        'commodity-codes-tree': getSessionValue(request, 'commodity-codes-tree')
      }

      if (sessionData['commodity-codes-tree'] == null) {
        const commodityCodeTree = await getCommodityCodesTreeData(
          'CVEDA',
          traceId,
          sessionData
        )
        setSessionValue(request, 'commodity-codes-tree', commodityCodeTree)
      }

      if (
        sessionData['commodity-code-details'] &&
        sessionData['commodity-selected-species']
      ) {
        let totalAnimals = 0
        let totalPacks = 0

        const speciesLst = sessionData['commodity-selected-species']
        speciesLst.forEach((species) => {
          totalAnimals += species.noOfAnimals ? Number(species.noOfAnimals) : 0
          totalPacks += species.noOfPacks ? Number(species.noOfPacks) : 0
        })

        const viewModel = {
          action: 'edit',
          commodityCodeDetails: sessionData['commodity-code-details'],
          speciesLst,
          totalAnimals,
          totalPacks
        }

        return h.view('import/templates/commodity-codes/select', viewModel)
      }

      let commoditySearchTab = 'selected'
      let speciesSearchTab = 'hidden'
      if (request.query['tab'] === 'species-search') {
        commoditySearchTab = 'hidden'
        speciesSearchTab = 'selected'
      }
      setSessionValue(request, 'commodity-search-tab', commoditySearchTab)
      setSessionValue(request, 'species-search-tab', speciesSearchTab)

      const viewModel = {
        commoditySearchTab,
        speciesSearchTab,
        commodityCodesParent: getSessionValue(request, 'commodity-codes-tree'),
        traceId,
        request,
        sessionData
      }
      return h.view('import/templates/commodity-codes/index', viewModel)
    }
  },

  search: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']
      const commodityCode = request.query['commodity-code']
        ? request.query['commodity-code']
        : request.params.commodityCode

      setSessionValue(request, 'commodity-code', commodityCode)
      const sessionData = {
        'commodity-code-details': getSessionValue(
          request,
          'commodity-code-details'
        ),
        'commodity-type': getSessionValue(request, 'commodity-type'),
        'species-quantities': getSessionValue(request, 'species-quantities')
      }
      setSessionValue(request, 'commodity-code', commodityCode)

      const viewModel = await buildCommodityCodeViewModel(
        'CVEDA',
        commodityCode,
        traceId,
        request,
        sessionData
      )

      if (request.params.commodityCode) {
        const commodityCodeNodeDetails = await getCommodityCodeChildNode(
          'CVEDA',
          request.params.commodityCode,
          traceId,
          sessionData
        )

        if (Number(commodityCodeNodeDetails.length) > 0) {
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

      setSessionValue(
        request,
        'commodity-code-details',
        viewModel.commodityCodeDetails
      )
      viewModel.commodityType = sessionData['commodity-type']
      setSessionValue(request, 'commodity-code-species', viewModel.speciesLst)

      return h.view('import/templates/commodity-codes/select', viewModel)
    }
  },

  select: {
    handler: async (request, h) => {
      const sessionData = {
        'commodity-code': getSessionValue(request, 'commodity-code'),
        'commodity-code-species': getSessionValue(
          request,
          'commodity-code-species'
        )
      }

      setSessionValue(request, 'commodity-type', request.query['commodityType'])
      const selectedSpeciesLst = []
      const selectedSpecies = Array.isArray(request.query['species'])
        ? request.query['species']
        : [request.query['species']]
      const speciesLst = sessionData['commodity-code-species']
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

      return h.redirect('/import/consignment/purpose')
    }
  },

  build: {
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
      const speciesLst = sessionData['commodity-selected-species']
      speciesLst.forEach((species) => {
        species.noOfAnimals = request.query[species.value + '-noOfAnimals']
        species.noOfPacks = request.query[species.value + '-noOfPacks']
      })

      setSessionValue(request, 'commodity-code-species', speciesLst.flat())

      return h.redirect('/import/consignment/purpose')
    }
  },

  tree: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']
      const sessionData = {
        'commodity-code': getSessionValue(request, 'commodity-code'),
        'commodity-codes': getSessionValue(request, 'commodity-codes'),
        'commodity-code-details': getSessionValue(
          request,
          'commodity-code-details'
        ),
        'commodity-selected-species': getSessionValue(
          request,
          'commodity-selected-species'
        ),
        'commodity-codes-tree': getSessionValue(request, 'commodity-codes-tree')
      }

      const parentCode = request.query['parent-code']
        ? request.query['parent-code']
        : request.params.parentCode
      const commodityCodesChild = await getCommodityCodeChildNode(
        'CVEDA',
        parentCode,
        traceId,
        sessionData
      )

      // narrow down the tree view
      const tmpCommodityCodesParent = await getCommodityCodesTreeData(
        'CVEDA',
        traceId,
        sessionData
      )
      const commodityCodesParent = tmpCommodityCodesParent.filter(
        (commodity) => commodity.code === parentCode
      )

      //build child nodes
      const childRoot = commodityCodesChild.filter(
        (commodity) =>
          request.params.parentCode === commodity.code &&
          commodity.parent === true
      )
      if (childRoot.length > 0) {
        const childNodes = getSessionValue(request, 'commodity-codes-child')
        childRoot.children = childNodes
      }

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

  speciesSearch: {
    handler: async (request, h) => {}
  }
}
