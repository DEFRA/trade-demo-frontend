import inert from '@hapi/inert'

import { start } from '../server/start/index.js'
import { examples } from '../server/examples/index.js'
import { view } from '../server/examples/view/index.js'
import { edit } from '../server/examples/edit/index.js'
import { deleteExample } from '../server/examples/delete/index.js'
import { createName } from '../server/examples/create-name/index.js'
import { createValue } from '../server/examples/create-value/index.js'
import { createCounter } from '../server/examples/create-counter/index.js'
import { createCheck } from '../server/examples/create-check/index.js'
import { createConfirmation } from '../server/examples/create-confirmation/index.js'
import { about } from '../server/about/index.js'
import { health } from '../server/health/index.js'
import { dashboard } from '../server/dashboard/index.js'
import { auth } from '../server/auth/index.js'
import { serveStaticFiles } from '../server/common/helpers/serve-static-files.js'

/**
 * Router Plugin
 *
 * Central route registration following CDP/Hapi community patterns
 * Registers all application routes in a consistent order
 *
 * IMPORTANT: This plugin must be registered AFTER auth plugin
 * Routes reference auth strategies that must already be configured
 *
 * Route registration order:
 * 1. Health check (required by CDP platform)
 * 2. Authentication routes (login, callback, logout)
 * 3. Protected routes (dashboard, etc.)
 * 4. Application routes (start, examples, about)
 * 5. Static asset serving
 */
export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])
      await server.register([health])

      // Authentication routes
      await server.register([auth])
      await server.register([dashboard])
      await server.register([
        start,
        examples,
        view,
        edit,
        deleteExample,
        createName,
        createValue,
        createCounter,
        createCheck,
        createConfirmation,
        about
      ])

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}
