import { describe, test, expect } from 'vitest'
import { originSchema } from './origin-schema.js'

describe('originSchema', () => {
  test('Should validate valid country code', () => {
    const payload = { 'origin-country': 'FR' }
    const { error } = originSchema.validate(payload)

    expect(error).toBeUndefined()
  })

  test('Should allow crumb field (CSRF token)', () => {
    const payload = {
      'origin-country': 'FR',
      crumb: 'csrf-token-value'
    }
    const { error } = originSchema.validate(payload)

    expect(error).toBeUndefined()
  })

  test('Should reject empty country', () => {
    const payload = { 'origin-country': '' }
    const { error } = originSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].message).toBe(
      'Select the country where the animal or product originates from'
    )
    expect(error.details[0].path).toEqual(['origin-country'])
  })

  test('Should reject missing country field', () => {
    const payload = {}
    const { error } = originSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('Select the country')
  })

  test('Should not strip unknown fields (for crumb)', () => {
    const payload = {
      'origin-country': 'FR',
      crumb: 'token'
    }
    const { value } = originSchema.validate(payload)

    expect(value.crumb).toBe('token')
    expect(value['origin-country']).toBe('FR')
  })

  test('Should accept any string value for country (no enum validation)', () => {
    const payload = { 'origin-country': 'ANYTHING' }
    const { error } = originSchema.validate(payload)

    // Schema only validates presence, not specific values
    expect(error).toBeUndefined()
  })

  test('Should trim whitespace not enforced by schema itself', () => {
    const payload = { 'origin-country': '  FR  ' }
    const { error, value } = originSchema.validate(payload)

    // Joi doesn't trim by default unless .trim() is used
    // Controller is responsible for trimming
    expect(error).toBeUndefined()
    expect(value['origin-country']).toBe('  FR  ') // Not trimmed by schema
  })
})
