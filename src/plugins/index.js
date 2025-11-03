import Scooter from '@hapi/scooter'
import { secureContext } from '@defra/hapi-secure-context'

import { requestLogger } from '../server/common/helpers/logging/request-logger.js'
import { requestTracing } from '../server/common/helpers/request-tracing.js'
import { pulse } from '../server/common/helpers/pulse.js'
import { nunjucksConfig } from '../config/nunjucks/nunjucks.js'
import { contentSecurityPolicy } from '../server/common/helpers/content-security-policy.js'
import { session } from './session.js'
import { csrf } from './csrf.js'
import { auth } from './auth.js'
import { router } from './router.js'

/**
 * Plugin Registration Array
 *
 * Follows CDP/Hapi community pattern: centralized plugin array
 * Exported and registered in src/server/server.js
 *
 * CRITICAL: Plugin order matters
 * 1. Request tracing (must be first for trace ID generation)
 * 2. Logging (needs trace context from tracing)
 * 3. Secure context (TLS/certificate handling)
 * 4. Pulse (metrics)
 * 5. Session (yar for Redis-backed sessions)
 * 6. Nunjucks (template engine)
 * 7. Crumb (CSRF protection)
 * 8. Scooter (user agent detection)
 * 9. Content Security Policy
 * 10. Auth (strategy registration - must be before router)
 * 11. Router (route registration - references auth strategies)
 *
 * @see src/server/server.js for plugin registration
 */
export const plugins = [
  requestLogger,
  requestTracing,
  secureContext,
  pulse,
  session,
  nunjucksConfig,
  csrf,
  Scooter,
  contentSecurityPolicy,
  auth,
  router
]
