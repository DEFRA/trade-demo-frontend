import { describe, test, expect } from 'vitest'
import {
  buildNotificationDto,
  hasNotificationData
} from './notification-builder.js'

describe('buildNotificationDto', () => {
  test('should build notification without status field', () => {
    const sessionData = {
      'notification-id': '123',
      'origin-country': 'FR',
      purpose: 'commercial'
    }

    const result = buildNotificationDto(sessionData)

    expect(result).toEqual({
      id: '123',
      chedReference: null,
      status: undefined, // Status should not be set
      originCountry: 'FR',
      commodity: null,
      importReason: 'commercial',
      internalMarketPurpose: null,
      transport: null
    })
  })

  test('should build notification with all fields without status parameter', () => {
    const sessionData = {
      'notification-id': '456',
      'origin-country': 'DE',
      'commodity-code': '0102',
      'commodity-code-description': 'Live bovine animals',
      'commodity-type': 'LIVE',
      'commodity-selected-species': [
        { text: 'Bos taurus', value: 'BOT', noOfAnimals: 10, noOfPacks: 2 }
      ],
      purpose: 'internal-market',
      'internal-market-purpose': 'Fattening',
      bcp: 'Felixstowe - GBFEL1',
      'transport-means-before': 'SHIP',
      'vehicle-identifier': 'SHIP123'
    }

    const result = buildNotificationDto(sessionData)

    expect(result.id).toBe('456')
    expect(result.status).toBeUndefined()
    expect(result.originCountry).toBe('DE')
    expect(result.commodity).toEqual({
      code: '0102',
      description: 'Live bovine animals',
      type: 'LIVE',
      species: [
        {
          name: 'Bos taurus',
          code: 'BOT',
          noOfAnimals: 10,
          noOfPackages: 2
        }
      ]
    })
    expect(result.importReason).toBe('internal-market')
    expect(result.internalMarketPurpose).toBe('Fattening')
    expect(result.transport).toEqual({
      bcpCode: 'GBFEL1',
      transportToBcp: 'SHIP',
      vehicleId: 'SHIP123'
    })
  })
})

describe('hasNotificationData', () => {
  test('should return true when notification has data', () => {
    const notification = {
      id: null,
      originCountry: 'FR'
    }

    expect(hasNotificationData(notification)).toBe(true)
  })

  test('should return false when notification has no data', () => {
    const notification = {
      id: '123',
      chedReference: null,
      status: undefined,
      originCountry: null,
      commodity: null,
      importReason: null,
      internalMarketPurpose: null,
      transport: null
    }

    expect(hasNotificationData(notification)).toBe(false)
  })
})
