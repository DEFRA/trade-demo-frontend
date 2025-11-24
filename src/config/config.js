import convict from 'convict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import convictFormatWithValidator from 'convict-format-with-validator'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const fourHoursMs = 14400000
const oneWeekMs = 604800000

const isLocal = process.env.NODE_ENV !== 'production'
const isPlatform = !isLocal // Deployed to CDP platform
const isTest = process.env.NODE_ENV === 'test'

// Environment-based configuration values
// All local vs platform decisions are made here in one place
const logFormat = isLocal ? 'pino-pretty' : 'ecs'
const logRedact = isLocal
  ? []
  : ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
const secureContextEnabled = isPlatform
const metricsEnabled = isPlatform
const sessionCacheEngine = isTest ? 'memory' : 'redis'
const sessionCookieSecure = isPlatform
const redisSingleInstance = isLocal
const redisTLS = isPlatform
const nunjucksWatch = isLocal
const nunjucksNoCache = isLocal
const csrfEnabled = !isTest
const csrfCookieSecure = isPlatform
const authForceHttps = isPlatform
const authSecure = isPlatform
// Bell OAuth state cookie - temporary cookie during OAuth redirect flow (app → DEFRA ID → callback)
// isSecure: false = cookie sent over HTTP or HTTPS. Required for local HTTP, works in CDP HTTPS.
// Single config for all environments. Matches cdp-defra-id-demo pattern.
const authCookieSecure = false
// isSameSite: 'Strict' = cookie only sent to same-site requests. Matches Bell default and cdp-defra-id-demo.
// If "Missing defra-id request token cookie" error in CDP, try 'Lax' (indicates cross-site redirect).
const authCookieSameSite = 'Strict'
// Session cookie sameSite - required for CDP platform to maintain session across page navigations
// 'Lax' allows session cookie to be sent during top-level navigation (e.g., OAuth redirects)
const sessionCookieSameSite = 'Lax'

convict.addFormats(convictFormatWithValidator)

export const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3000,
    env: 'PORT'
  },
  staticCacheTimeout: {
    doc: 'Static cache timeout in milliseconds',
    format: Number,
    default: oneWeekMs,
    env: 'STATIC_CACHE_TIMEOUT'
  },
  serviceName: {
    doc: 'Applications Service Name',
    format: String,
    default: 'trade-demo-frontend'
  },
  appBaseUrl: {
    doc: 'Application base URL for OAuth callbacks',
    format: String,
    default: 'http://localhost:3000',
    env: 'APP_BASE_URL'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.resolve(dirname, '../..')
  },
  assetPath: {
    doc: 'Asset path',
    format: String,
    default: '/public',
    env: 'ASSET_PATH'
  },
  isLocal: {
    doc: 'If this application is running locally (vs deployed to CDP platform)',
    format: Boolean,
    default: isLocal
  },
  isPlatform: {
    doc: 'If this application is deployed to CDP platform (vs running locally)',
    format: Boolean,
    default: isPlatform
  },
  log: {
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: process.env.NODE_ENV !== 'test',
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in.',
      format: ['ecs', 'pino-pretty'],
      default: logFormat,
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: logRedact
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: secureContextEnabled,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  isMetricsEnabled: {
    doc: 'Enable metrics reporting',
    format: Boolean,
    default: metricsEnabled,
    env: 'ENABLE_METRICS'
  },
  session: {
    cache: {
      engine: {
        doc: 'backend cache is written to',
        format: ['redis', 'memory'],
        default: sessionCacheEngine,
        env: 'SESSION_CACHE_ENGINE'
      },
      name: {
        doc: 'server side session cache name',
        format: String,
        default: 'session',
        env: 'SESSION_CACHE_NAME'
      },
      ttl: {
        doc: 'server side session cache ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_CACHE_TTL'
      }
    },
    cookie: {
      ttl: {
        doc: 'Session cookie ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_COOKIE_TTL'
      },
      password: {
        doc: 'session cookie password',
        format: String,
        default: 'the-password-must-be-at-least-32-characters-long',
        env: 'SESSION_COOKIE_PASSWORD',
        sensitive: true
      },
      secure: {
        doc: 'set secure flag on cookie',
        format: Boolean,
        default: sessionCookieSecure,
        env: 'SESSION_COOKIE_SECURE'
      },
      sameSite: {
        doc: 'SameSite attribute for session cookie (Lax required for CDP platform)',
        format: ['Strict', 'Lax', 'None'],
        default: sessionCookieSameSite,
        env: 'SESSION_COOKIE_SAME_SITE'
      }
    }
  },
  redis: {
    host: {
      doc: 'Redis cache host',
      format: String,
      default: '127.0.0.1',
      env: 'REDIS_HOST'
    },
    username: {
      doc: 'Redis cache username',
      format: String,
      default: '',
      env: 'REDIS_USERNAME'
    },
    password: {
      doc: 'Redis cache password',
      format: '*',
      default: '',
      sensitive: true,
      env: 'REDIS_PASSWORD'
    },
    keyPrefix: {
      doc: 'Redis cache key prefix name used to isolate the cached results across multiple clients',
      format: String,
      default: 'trade-demo-frontend:',
      env: 'REDIS_KEY_PREFIX'
    },
    useSingleInstanceCache: {
      doc: 'Connect to a single instance of redis instead of a cluster.',
      format: Boolean,
      default: redisSingleInstance,
      env: 'USE_SINGLE_INSTANCE_CACHE'
    },
    useTLS: {
      doc: 'Connect to redis using TLS',
      format: Boolean,
      default: redisTLS,
      env: 'REDIS_TLS'
    }
  },
  nunjucks: {
    watch: {
      doc: 'Reload templates when they are changed.',
      format: Boolean,
      default: nunjucksWatch
    },
    noCache: {
      doc: 'Use a cache and recompile templates each time',
      format: Boolean,
      default: nunjucksNoCache
    }
  },
  csrf: {
    enabled: {
      doc: 'Enable CSRF protection (disabled during test runs)',
      format: Boolean,
      default: csrfEnabled
    },
    cookie: {
      secure: {
        doc: 'Set secure flag on CSRF cookie',
        format: Boolean,
        default: csrfCookieSecure
      }
    }
  },
  auth: {
    forceHttps: {
      doc: 'Force HTTPS in OAuth flows',
      format: Boolean,
      default: authForceHttps
    },
    secure: {
      doc: 'Use secure cookies in OAuth flows',
      format: Boolean,
      default: authSecure
    },
    cookie: {
      secure: {
        doc: 'Set secure flag on Bell OAuth state cookie (must be false for CDP platform)',
        format: Boolean,
        default: authCookieSecure,
        env: 'AUTH_COOKIE_SECURE'
      },
      sameSite: {
        doc: 'SameSite attribute for Bell OAuth state cookie',
        format: ['Strict', 'Lax', 'None'],
        default: authCookieSameSite,
        env: 'AUTH_COOKIE_SAME_SITE'
      }
    }
  },
  tracing: {
    header: {
      doc: 'Which header to track',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  backendApi: {
    baseUrl: {
      doc: 'Backend API base URL',
      format: String,
      default: 'http://localhost:8085',
      env: 'BACKEND_API_URL'
    }
  },
  defraId: {
    oidcDiscoveryUrl: {
      doc: 'DEFRA ID OIDC discovery URL',
      format: String,
      default:
        'http://localhost:3200/cdp-defra-id-stub/.well-known/openid-configuration',
      env: 'DEFRA_ID_OIDC_CONFIGURATION_URL'
    },
    clientId: {
      doc: 'DEFRA ID OAuth client ID',
      format: String,
      default: 'b8c5e0bd-8223-4908-a5aa-c9c1d7cddaac',
      env: 'DEFRA_ID_CLIENT_ID'
    },
    clientSecret: {
      doc: 'DEFRA ID OAuth client secret',
      format: String,
      default: 'test_value',
      sensitive: true,
      env: 'DEFRA_ID_CLIENT_SECRET'
    },
    serviceId: {
      doc: 'DEFRA ID service identifier',
      format: String,
      default: 'aeaa0a80-15f3-48b2-8bd7-0e02874b3d32',
      env: 'DEFRA_ID_SERVICE_ID'
    },
    tokenRefreshBufferMinutes: {
      doc: 'Minutes before token expiry to trigger refresh (prevents race conditions)',
      format: Number,
      default: 1,
      env: 'DEFRA_ID_TOKEN_REFRESH_BUFFER_MINUTES'
    }
  },
  services: {
    commodityCode: {
      baseUrl: {
        doc: 'Backend API base URL',
        format: String,
        default:
          'https://ephemeral-protected.api.dev.cdp-int.defra.cloud/trade-commodity-codes',
        env: 'COMMODITY_CODE_API_URL'
      },
      auth: {
        doc: 'Backend API auth header',
        format: String,
        default: 'TuHiSuP8ltJg2obc9KgW3FU8Zv9ircWn'
      }
    }
  }
})

config.validate({ allowed: 'strict' })
