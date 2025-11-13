import yar from '@hapi/yar'
import { config } from '../config/config.js'

/**
 * Session Plugin
 *
 * Wraps @hapi/yar for Redis-backed session management
 *
 * Session data stored server-side (Redis production, memory development)
 * Only session ID stored in httpOnly cookie (secure, not accessible to JS)
 *
 * Configuration from convict:
 * - session.cache.name: Redis cache name
 * - session.cache.ttl: Session expiry time
 * - session.cookie.password: Cookie encryption password (min 32 chars)
 * - session.cookie.ttl: Cookie time-to-live
 * - session.cookie.secure: HTTPS-only in production
 *
 * @see https://hapi.dev/module/yar/ for Yar documentation
 */
export const session = {
  name: 'session',
  plugin: yar,
  options: {
    name: config.get('session.cache.name'),
    cache: {
      cache: config.get('session.cache.name'),
      expiresIn: config.get('session.cache.ttl')
    },
    storeBlank: false,
    errorOnCacheNotReady: true,
    cookieOptions: {
      password: config.get('session.cookie.password'),
      ttl: config.get('session.cookie.ttl'),
      isSecure: config.get('session.cookie.secure'),
      isSameSite: config.get('session.cookie.sameSite'),
      clearInvalid: true
    }
  }
}
