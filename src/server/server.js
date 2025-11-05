import path from 'path'
import hapi from '@hapi/hapi'

import { plugins } from '../plugins/index.js'
import { config } from '../config/config.js'
import { catchAll } from './common/helpers/errors.js'
import { setupProxy } from './common/helpers/proxy/setup-proxy.js'
import { getCacheEngine } from './common/helpers/session-cache/cache-engine.js'

export async function createServer() {
  setupProxy()

  const server = hapi.server({
    host: config.get('host'),
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    },
    cache: [
      {
        name: config.get('session.cache.name'),
        engine: getCacheEngine(config.get('session.cache.engine'))
      }
    ],
    state: {
      strictHeader: false
    }
  })
  // Register all plugins in correct order
  // See src/plugins/index.js for plugin registration order and documentation
  await server.register(plugins)

  server.ext('onPreResponse', catchAll)

  return server
}
