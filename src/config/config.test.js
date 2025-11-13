import { describe, test, expect } from 'vitest'
import { config } from './config.js'

// Config comparison matrix: [LOCAL, TEST, PLATFORM]
// LOCAL = NODE_ENV !== 'production' && NODE_ENV !== 'test'
// TEST = NODE_ENV === 'test'
// PLATFORM = NODE_ENV === 'production' (deployed to CDP)
const configMatrix = {
  isLocal: [true, true, false],
  isPlatform: [false, false, true],
  'log.format': ['pino-pretty', 'pino-pretty', 'ecs'],
  'log.redact': [
    [],
    [],
    ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
  ],
  isSecureContextEnabled: [false, false, true],
  isMetricsEnabled: [false, false, true],
  'session.cache.engine': ['redis', 'memory', 'redis'], // Redis for local dev (Docker), memory for unit tests, Redis for platform
  'session.cookie.secure': [false, false, true],
  'redis.useSingleInstanceCache': [true, true, false],
  'redis.useTLS': [false, false, true],
  'nunjucks.watch': [true, true, false],
  'nunjucks.noCache': [true, true, false],
  'csrf.enabled': [true, false, true], // TEST mode disables CSRF
  'csrf.cookie.secure': [false, false, true],
  'auth.forceHttps': [false, false, true],
  'auth.secure': [false, false, true],
  'auth.cookie.secure': [false, false, false], // Always false (HTTP local, HTTP post-ALB)
  'auth.cookie.sameSite': ['Strict', 'Strict', 'Strict'] // Match Bell default and cdp-defra-id-demo
}

describe('Config Comparison Matrix', () => {
  const TEST_MODE = 1 // Index in matrix: [LOCAL=0, TEST=1, PLATFORM=2]

  test('Should match expected TEST mode configuration', () => {
    Object.entries(configMatrix).forEach(([key, values]) => {
      const expected = values[TEST_MODE]
      const actual = config.get(key)

      expect(actual).toEqual(expected)
    })
  })
})

describe('DEFRA ID Configuration', () => {
  test('Should load DEFRA ID environment variables', () => {
    expect(config.has('defraId.oidcDiscoveryUrl')).toBe(true)
    expect(config.has('defraId.serviceId')).toBe(true)
    expect(config.has('defraId.clientId')).toBe(true)
    expect(config.has('defraId.clientSecret')).toBe(true)
  })

  test('Should mark clientSecret as sensitive', () => {
    const schema = config.getSchema()
    expect(
      schema._cvtProperties.defraId._cvtProperties.clientSecret.sensitive
    ).toBe(true)
  })

  test('Should access DEFRA ID configuration values', () => {
    const oidcDiscoveryUrl = config.get('defraId.oidcDiscoveryUrl')
    const serviceId = config.get('defraId.serviceId')
    const clientId = config.get('defraId.clientId')
    const clientSecret = config.get('defraId.clientSecret')

    expect(typeof oidcDiscoveryUrl).toBe('string')
    expect(typeof serviceId).toBe('string')
    expect(typeof clientId).toBe('string')
    expect(typeof clientSecret).toBe('string')
  })
})
