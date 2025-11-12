import { describe, test, expect } from 'vitest'
import { buildOriginViewModel, buildPurposeViewModel } from './view-models.js'

describe('buildOriginViewModel', () => {
  test('Should build view model with empty country when no session data', () => {
    const viewModel = buildOriginViewModel({})

    expect(viewModel).toEqual({
      pageTitle: 'Select the country where the animal originates from',
      heading: 'Select the country where the animal originates from',
      originCountry: ''
    })
  })

  test('Should build view model with existing country from session', () => {
    const sessionData = { 'origin-country': 'FR' }
    const viewModel = buildOriginViewModel(sessionData)

    expect(viewModel.originCountry).toBe('FR')
    expect(viewModel.pageTitle).toBe(
      'Select the country where the animal originates from'
    )
  })

  test('Should include error list when validation error provided', () => {
    const validationError = {
      details: [
        {
          message: 'Select the country',
          path: ['origin-country']
        }
      ]
    }

    const viewModel = buildOriginViewModel({}, validationError)

    expect(viewModel.errorList).toBeDefined()
    expect(viewModel.errorList[0]).toEqual({
      text: 'Select the country',
      href: '#origin-country'
    })
    expect(viewModel.formError).toEqual({
      text: 'Select the country'
    })
  })

  test('Should preserve country value when validation error provided', () => {
    const sessionData = { 'origin-country': 'INVALID' }
    const validationError = {
      details: [
        {
          message: 'Invalid country',
          path: ['origin-country']
        }
      ]
    }

    const viewModel = buildOriginViewModel(sessionData, validationError)

    expect(viewModel.originCountry).toBe('INVALID')
    expect(viewModel.errorList).toBeDefined()
  })
})

describe('buildPurposeViewModel', () => {
  test('Should build view model with empty purpose when no session data', () => {
    const viewModel = buildPurposeViewModel({})

    expect(viewModel).toEqual({
      pageTitle: 'What is the main reason for importing the animals?',
      heading: 'What is the main reason for importing the animals?',
      purpose: '',
      internalMarketPurpose: ''
    })
  })

  test('Should build view model with existing purpose from session', () => {
    const sessionData = {
      purpose: 'internalmarket',
      'internal-market-purpose': 'breeding'
    }
    const viewModel = buildPurposeViewModel(sessionData)

    expect(viewModel.purpose).toBe('internalmarket')
    expect(viewModel.internalMarketPurpose).toBe('breeding')
    expect(viewModel.pageTitle).toBe(
      'What is the main reason for importing the animals?'
    )
  })

  test('Should handle re-entry purpose without internal market purpose', () => {
    const sessionData = {
      purpose: 're-entry'
    }
    const viewModel = buildPurposeViewModel(sessionData)

    expect(viewModel.purpose).toBe('re-entry')
    expect(viewModel.internalMarketPurpose).toBe('')
  })

  test('Should include error list when validation error provided', () => {
    const validationError = {
      details: [
        {
          message: 'Select the main reason',
          path: ['purpose']
        }
      ]
    }

    const viewModel = buildPurposeViewModel({}, validationError)

    expect(viewModel.errorList).toBeDefined()
    expect(viewModel.errorList[0]).toEqual({
      text: 'Select the main reason',
      href: '#purpose'
    })
    expect(viewModel.formError).toEqual({
      text: 'Select the main reason'
    })
  })

  test('Should preserve purpose values when validation error provided', () => {
    const sessionData = {
      purpose: 'internalmarket',
      'internal-market-purpose': ''
    }
    const validationError = {
      details: [
        {
          message: 'Select what the animals are for',
          path: ['internal-market-purpose']
        }
      ]
    }

    const viewModel = buildPurposeViewModel(sessionData, validationError)

    expect(viewModel.purpose).toBe('internalmarket')
    expect(viewModel.internalMarketPurpose).toBe('')
    expect(viewModel.errorList).toBeDefined()
  })

  test('Should handle undefined session values gracefully', () => {
    const sessionData = {
      purpose: undefined,
      'internal-market-purpose': undefined
    }
    const viewModel = buildPurposeViewModel(sessionData)

    expect(viewModel.purpose).toBe('')
    expect(viewModel.internalMarketPurpose).toBe('')
  })
})
