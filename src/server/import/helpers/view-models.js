import { formatValidationErrors } from './validation-helpers.js'

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
