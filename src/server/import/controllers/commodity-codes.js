import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import {
  buildCommodityCodeViewModel,
  getCommodityCodeChildNode,
  getCommodityCodeTree
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
        const commodityCodeTree = await getCommodityCodeTree(
          sessionData['commodity-codes'],
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

      const viewModel = buildCommodityCodeViewModel(
        sessionData['commodity-code'],
        traceId,
        request,
        sessionData
      )
      if (request.query['tab'] === 'species-search') {
        viewModel.commoditySearchTab = 'hidden'
        viewModel.speciesSearchTab = 'selected'
      } else {
        viewModel.commoditySearchTab = 'selected'
        viewModel.speciesSearchTab = 'hidden'
      }
      viewModel.commodityCodesTree = sessionData['commodity-codes-tree']
      return h.view('import/templates/commodity-codes/index', viewModel)
    }
  },

  search: {
    handler: async (request, h) => {
      const traceId = request.headers['x-cdp-request-id']
      const commodityCode = request.query['commodity-code']

      setSessionValue(request, 'commodity-code', commodityCode)
      const sessionData = {
        'commodity-code-details': getSessionValue(
          request,
          'commodity-code-details'
        ),
        'species-quantities': getSessionValue(request, 'species-quantities')
      }
      setSessionValue(request, 'commodity-code', commodityCode)

      const viewModel = await buildCommodityCodeViewModel(
        commodityCode,
        traceId,
        request,
        sessionData
      )

      setSessionValue(
        request,
        'commodity-code-details',
        viewModel.commodityCodeDetails
      )
      setSessionValue(request, 'commodity-code-species', viewModel.speciesLst)

      // Redirect to next step (purpose screen)
      return h.view('import/templates/commodity-codes/select', viewModel)
    }
  },

  select: {
    handler(request, h) {
      const sessionData = {
        'commodity-code': getSessionValue(request, 'commodity-code'),
        'commodity-code-species': getSessionValue(
          request,
          'commodity-code-species'
        )
      }

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

      const parentCode = request.params.parentCode
      const viewModel = await getCommodityCodeChildNode(
        parentCode,
        traceId,
        sessionData
      )
      if (request.query['tab'] === 'species-search') {
        viewModel.commoditySearchTab = 'hidden'
        viewModel.speciesSearchTab = 'selected'
      } else {
        viewModel.commoditySearchTab = 'selected'
        viewModel.speciesSearchTab = 'hidden'
      }
      viewModel.commodityCodesTree = sessionData['commodity-codes-tree']
      return h.view('import/templates/commodity-codes/index', viewModel)
    }
  }
}
