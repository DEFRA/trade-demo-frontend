import _ from 'lodash'
import { formatValidationErrors } from './validation-helpers.js'
import { commodityCodeApi } from '../integration/commodity-code-api-client.js'

/**
 * Build view model for origin screen
 * @param {Object} sessionData - Session data containing origin-country
 * @param {Object} validationError - Optional Joi validation error
 * @returns {Object} View model for template
 */
export function buildOriginViewModel(sessionData = {}, validationError = null) {
  const formattedErrors = validationError
    ? formatValidationErrors(validationError)
    : null

  const viewModel = {
    pageTitle: 'Select the country where the animal originates from',
    heading: 'Select the country where the animal originates from',
    originCountry: sessionData['origin-country'] || ''
  }

  if (formattedErrors) {
    viewModel.errorList = formattedErrors.errorList
    viewModel.formError = {
      text: formattedErrors.errorList[0].text
    }
  }

  return viewModel
}

export async function buildCommodityCodeViewModel(
  certType,
  commodityCode,
  traceId,
  request,
  sessionData = {},
  validationError = null
) {
  const commodityCodesResponse = Object.values(
    await commodityCodeApi.findCommodityByCode(commodityCode, traceId)
  )
  const commodityCategoryResponse = await commodityCodeApi.getCommodityCategory(
    certType,
    commodityCode,
    traceId
  )

  const commodityCategory = JSON.parse(
    _.get(commodityCategoryResponse, 'data', '')
  )

  // if (!commodityCategory.species.length > 0) {
  //   request.payload.hasSpecies = true
  // }
  const commodityTypes = _.uniqBy(commodityCategory.types, 'text')
  const speciesLst = _.uniqBy(commodityCategory.species, 'text')
  speciesLst.forEach((s) => {
    s.selected = false
  })

  return {
    commodityCodeDetails: commodityCodesResponse,
    speciesLst,
    commodityTypes,
    isChecked: false
  }
}

export async function getCommodityCodesTreeData(
  certType,
  traceId,
  request,
  sessionData = {}
) {
  const commodityCodesTree = await commodityCodeApi.getTopLevelCommodityTree(
    certType,
    traceId
  )

  return Object.values(commodityCodesTree)
}

export async function getCommodityCodeChildNode(
  certType,
  parentCode,
  traceId,
  request,
  sessionData = {}
) {
  const commodityCodeNodeDetails = await commodityCodeApi.getByParentCode(
    certType,
    parentCode,
    request,
    sessionData
  )

  return Object.values(commodityCodeNodeDetails)
}

export async function getAllParentCodes(
  certType,
  commodityCode,
  traceId,
  sessionData = {}
) {
  const allParentCodes = await commodityCodeApi.getAllParents(
    certType,
    traceId,
    sessionData
  )

  return Object.values(allParentCodes)
}

/**
 * Build view model for purpose screen
 * @param {Object} sessionData - Session data containing purpose and internal-market-purpose
 * @param {Object} validationError - Optional Joi validation error
 * @returns {Object} View model for template
 */
export function buildPurposeViewModel(
  sessionData = {},
  validationError = null
) {
  const formattedErrors = validationError
    ? formatValidationErrors(validationError)
    : null

  const viewModel = {
    pageTitle: 'What is the main reason for importing the animals?',
    heading: 'What is the main reason for importing the animals?',
    purpose: sessionData.purpose || '',
    internalMarketPurpose: sessionData['internal-market-purpose'] || ''
  }

  if (formattedErrors) {
    viewModel.errorList = formattedErrors.errorList
    viewModel.formError = {
      text: formattedErrors.errorList[0].text
    }
  }

  return viewModel
}

/**
 * Build view model for review screen
 * @param {Object} sessionData - Session data containing all journey data
 * @param {Object} validationError - Optional Joi validation error
 * @returns {Object} View model for template
 */
export function buildReviewViewModel(sessionData = {}, validationError = null) {
  const formattedErrors = validationError
    ? formatValidationErrors(validationError)
    : null

  // Build summary list rows
  const summaryRows = []

  // Origin section
  if (sessionData['origin-country']) {
    summaryRows.push({
      key: {
        text: 'Country of origin'
      },
      value: {
        text: sessionData['origin-country']
      },
      actions: {
        items: [
          {
            href: '/import/consignment/origin',
            text: 'Change',
            visuallyHiddenText: 'country of origin'
          }
        ]
      }
    })
  }

  // Commodity codes
  if (sessionData['commodity-code-details']) {
    const speciesLst = sessionData['commodity-selected-species']

    // check if commodity code flow is complete
    let isComplete = false
    if (speciesLst) {
      speciesLst.forEach((species) => {
        isComplete = !(!species.noOfAnimals || !species.noOfPacks)
      })
    }

    summaryRows.push({
      key: {
        text: 'Commodity'
      },
      value: {
        text: ''
      },
      actions: {
        items: [
          {
            href: '/import/commodity/codes',
            text: isComplete ? 'Change' : 'To do',
            visuallyHiddenText: 'commodity codes'
          }
        ]
      }
    })
  }

  // Purpose section
  if (sessionData.purpose) {
    summaryRows.push({
      key: {
        text: 'Main reason for import'
      },
      value: {
        text: sessionData.purpose
      },
      actions: {
        items: [
          {
            href: '/import/consignment/purpose',
            text: 'Change',
            visuallyHiddenText: 'main reason for import'
          }
        ]
      }
    })
  }

  // Internal market purpose (conditional)
  if (sessionData['internal-market-purpose']) {
    summaryRows.push({
      key: {
        text: 'Internal market purpose'
      },
      value: {
        text: sessionData['internal-market-purpose']
      },
      actions: {
        items: [
          {
            href: '/import/consignment/purpose',
            text: 'Change',
            visuallyHiddenText: 'internal market purpose'
          }
        ]
      }
    })
  }

  const viewModel = {
    pageTitle: 'Check your answers before submitting',
    heading: 'Check your answers before submitting',
    summaryList: {
      rows: summaryRows
    }
  }

  if (formattedErrors) {
    viewModel.errorList = formattedErrors.errorList
    viewModel.formError = {
      text: formattedErrors.errorList[0].text
    }
  }

  return viewModel
}
