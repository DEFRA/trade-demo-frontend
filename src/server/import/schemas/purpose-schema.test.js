import { describe, test, expect } from 'vitest'
import { purposeSchema } from './purpose-schema.js'

describe('purposeSchema', () => {
  describe('Valid purpose values', () => {
    test('Should validate valid purpose: internalmarket with specific purpose', () => {
      const payload = {
        purpose: 'internalmarket',
        'internal-market-purpose': 'breeding'
      }
      const { error } = purposeSchema.validate(payload)

      expect(error).toBeUndefined()
    })

    test('Should validate valid purpose: re-entry', () => {
      const payload = {
        purpose: 're-entry'
      }
      const { error } = purposeSchema.validate(payload)

      expect(error).toBeUndefined()
    })

    test('Should allow crumb field (CSRF token)', () => {
      const payload = {
        purpose: 'internalmarket',
        'internal-market-purpose': 'breeding',
        crumb: 'csrf-token'
      }
      const { error } = purposeSchema.validate(payload)

      expect(error).toBeUndefined()
    })
  })

  describe('Invalid purpose values', () => {
    test('Should reject empty purpose', () => {
      const payload = { purpose: '' }
      const { error } = purposeSchema.validate(payload)

      expect(error).toBeDefined()
      // Empty string triggers .valid() check, which returns 'any.only' error
      expect(error.details[0].message).toBe(
        'Select a valid reason for importing the animals'
      )
      expect(error.details[0].path).toEqual(['purpose'])
    })

    test('Should reject missing purpose field', () => {
      const payload = {}
      const { error } = purposeSchema.validate(payload)

      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('Select the main reason')
    })

    test('Should reject invalid purpose value', () => {
      const payload = { purpose: 'invalid-value' }
      const { error } = purposeSchema.validate(payload)

      expect(error).toBeDefined()
      expect(error.details[0].message).toBe(
        'Select a valid reason for importing the animals'
      )
    })
  })

  describe('Conditional validation for internal-market-purpose', () => {
    test('Should require internal-market-purpose when purpose is internalmarket', () => {
      const payload = {
        purpose: 'internalmarket',
        'internal-market-purpose': ''
      }
      const { error } = purposeSchema.validate(payload)

      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Select what the animals are for')
      expect(error.details[0].path).toEqual(['internal-market-purpose'])
    })

    test('Should require internal-market-purpose when purpose is internalmarket and field is missing', () => {
      const payload = {
        purpose: 'internalmarket'
      }
      const { error } = purposeSchema.validate(payload)

      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Select what the animals are for')
    })

    test('Should not require internal-market-purpose when purpose is re-entry', () => {
      const payload = {
        purpose: 're-entry'
      }
      const { error } = purposeSchema.validate(payload)

      expect(error).toBeUndefined()
    })

    test('Should allow empty internal-market-purpose when purpose is re-entry', () => {
      const payload = {
        purpose: 're-entry',
        'internal-market-purpose': ''
      }
      const { error } = purposeSchema.validate(payload)

      expect(error).toBeUndefined()
    })

    test('Should allow null internal-market-purpose when purpose is re-entry', () => {
      const payload = {
        purpose: 're-entry',
        'internal-market-purpose': null
      }
      const { error } = purposeSchema.validate(payload)

      expect(error).toBeUndefined()
    })
  })

  describe('Valid internal-market-purpose values', () => {
    const validValues = [
      'commercial',
      'rescue',
      'breeding',
      'research',
      'racing',
      'companion',
      'production',
      'slaughter',
      'fattening',
      'restocking'
    ]

    validValues.forEach((value) => {
      test(`Should accept internal-market-purpose: ${value}`, () => {
        const payload = {
          purpose: 'internalmarket',
          'internal-market-purpose': value
        }
        const { error } = purposeSchema.validate(payload)

        expect(error).toBeUndefined()
      })
    })
  })

  describe('Schema behavior', () => {
    test('Should not strip unknown fields (for crumb)', () => {
      const payload = {
        purpose: 'internalmarket',
        'internal-market-purpose': 'breeding',
        crumb: 'token'
      }
      const { value } = purposeSchema.validate(payload)

      expect(value.crumb).toBe('token')
      expect(value.purpose).toBe('internalmarket')
      expect(value['internal-market-purpose']).toBe('breeding')
    })

    test('Should validate with abortEarly: false to collect all errors', () => {
      const payload = {
        purpose: '',
        'internal-market-purpose': ''
      }
      const { error } = purposeSchema.validate(payload, {
        abortEarly: false
      })

      expect(error).toBeDefined()
      // Should have error for purpose being empty
      expect(error.details.length).toBeGreaterThanOrEqual(1)
    })
  })
})
