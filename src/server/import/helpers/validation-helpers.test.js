import { describe, test, expect } from 'vitest'
import { formatValidationErrors } from './validation-helpers.js'

describe('formatValidationErrors', () => {
  test('Should format single field error', () => {
    const joiError = {
      details: [
        {
          message: 'Field is required',
          path: ['fieldName']
        }
      ]
    }

    const formatted = formatValidationErrors(joiError)

    expect(formatted.errorList).toEqual([
      {
        text: 'Field is required',
        href: '#fieldName'
      }
    ])
    expect(formatted.fieldErrors).toEqual({
      fieldName: { text: 'Field is required' }
    })
  })

  test('Should format multiple field errors', () => {
    const joiError = {
      details: [
        { message: 'Field 1 is required', path: ['field1'] },
        { message: 'Field 2 is invalid', path: ['field2'] }
      ]
    }

    const formatted = formatValidationErrors(joiError)

    expect(formatted.errorList).toHaveLength(2)
    expect(formatted.errorList[0]).toEqual({
      text: 'Field 1 is required',
      href: '#field1'
    })
    expect(formatted.errorList[1]).toEqual({
      text: 'Field 2 is invalid',
      href: '#field2'
    })
    expect(formatted.fieldErrors.field1).toEqual({
      text: 'Field 1 is required'
    })
    expect(formatted.fieldErrors.field2).toEqual({
      text: 'Field 2 is invalid'
    })
  })

  test('Should handle hyphenated field names', () => {
    const joiError = {
      details: [
        {
          message: 'Country is required',
          path: ['origin-country']
        }
      ]
    }

    const formatted = formatValidationErrors(joiError)

    expect(formatted.errorList[0].href).toBe('#origin-country')
    expect(formatted.fieldErrors['origin-country']).toEqual({
      text: 'Country is required'
    })
  })

  test('Should handle nested field paths', () => {
    const joiError = {
      details: [
        {
          message: 'Nested field error',
          path: ['parent', 'child']
        }
      ]
    }

    const formatted = formatValidationErrors(joiError)

    expect(formatted.errorList[0].href).toBe('#parent-child')
    expect(formatted.fieldErrors['parent-child']).toEqual({
      text: 'Nested field error'
    })
  })
})
