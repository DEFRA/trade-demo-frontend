# Live Animal Import Journey - Architecture

## Table of Contents

- [Overview](#overview)
  - [Technology Stack](#technology-stack)
  - [Data Model Architecture](#data-model-architecture)
  - [Architecture Principles](#architecture-principles)
- [Plugin Architecture](#plugin-architecture)
  - [Plugin Export Pattern](#plugin-export-pattern)
  - [Import Journey Plugin](#import-journey-plugin)
  - [Directory Structure](#directory-structure)
- [Session Management](#session-management)
  - [Configuration](#configuration)
  - [Flat PageModel Structure](#flat-pagemodel-structure)
  - [PageModel Accumulation Pattern](#pagemodel-accumulation-pattern)
- [Form Patterns](#form-patterns)
  - [Validation](#validation)
  - [Error Handling](#error-handling)
  - [CSRF Protection](#csrf-protection)
  - [View Model Builders](#view-model-builders)
- [Local Development](#local-development)

## Overview

### Technology Stack

- **Backend**: Hapi.js (Node.js)
- **Templates**: Nunjucks
- **Design System**: GOV.UK Design System
- **Forms**: GOV.UK Frontend components
- **Validation**: Joi (server-side) + GOV.UK error patterns (`src/server/import/validators/schemas.js`)
- **Session Management**: @hapi/yar with Redis backend (`src/server/common/helpers/session-helpers.js`)
- **Authentication**: @hapi/bell (OAuth2/OIDC) [oauth-oidc.md](oauth-oidc.md)

### Data Model Architecture

Three distinct data representations:

1. **Page Model** (Frontend - Redis Session)

   - Flat key-value structure stored in user session
   - Mirrors form input fields exactly
   - Managed by @hapi/yar session plugin
   - Example: `{ numberOfAnimals: "12", certificationPurpose: "Breeding" }`

2. **Journey Model** (Backend - Domain Model)

   - WIP [domain-model.md](domain-model.md)
   - Nested domain model representing business concepts
   - Transforms page model into business entities

3. **CHED Model** (IPAFFS Technical Format)
   - IPAFFS-specific JSON structure
   - Backend transforms journey model → CHED for API submission
   - Example structure in `docs/draft-cheda-*.json`

### Architecture Principles

**Two-Layer Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│ src/plugins/                   INFRASTRUCTURE LAYER         │
│                                                             │
│ • auth.js          → Authentication strategies              │
│ • session.js       → Redis session management               │
│ • csrf.js          → CSRF protection                        │
│ • router.js        → Route aggregation                      │
│ • request-*.js     → Logging, tracing                       │
└─────────────────────────────────────────────────────────────┘
                            ↓ registers
┌─────────────────────────────────────────────────────────────┐
│ src/server/                   APPLICATION LAYER             │
│                                                             │
│ • import/          → Import journey (multi-page)            │
│ • dashboard/       → Dashboard (single page)                │
│ • auth/            → Auth routes (login/logout)             │
│ • health/          → Health check endpoint                  │
└─────────────────────────────────────────────────────────────┘
```

Infrastructure plugins provide capabilities (strategies, sessions, CSRF tokens). Feature plugins consume those capabilities to implement business logic.

**Key Patterns:**

- **One plugin per journey** (not per page): Multi-page journeys organized as one plugin that registers all journey routes
- **Factory pattern for testability**: Controllers accept dependencies for injection
- **Dumb templates**: View model builders prepare all data; templates contain zero logic

## Plugin Architecture

### Plugin Export Pattern

All plugins follow the same structure:

```javascript
export const pluginName = {
  plugin: {
    name: 'plugin-name',
    register(server) {
      // Plugin logic: either server.route([...]) or await server.register([...])
    }
  }
}
```

**Two registration patterns:**

1. **Infrastructure plugins** register other plugins and configure strategies:

   ```javascript
   async register(server) {
     await server.register([Bell, Cookie])
     server.auth.strategy('session', 'cookie', {
       validate: async (request, session) => { /* ... */ }
     })
   }
   ```

2. **Feature plugins** register routes:

   ```javascript
   register(server) {
     server.route([
       { method: 'GET', path: '/import/commodity', ...controller.get }
     ])
   }
   ```

### Import Journey Plugin

Import journey implemented as **one plugin** registering all journey routes.

**Why a Plugin?**

1. **Encapsulation** - All import journey routes, controllers, validators, views live in `src/server/import/`
2. **Clear boundaries** - Plugin name (`import-journey`) maps to user-facing journey
3. **Composability** - Can be registered/unregistered as a unit
4. **Testability** - Integration tests can test entire journey flow
5. **Reusability** - Could be extracted to separate npm package if needed

**Controller Factory Pattern:**

```javascript
// Factory function for testing (accepts mock dependencies)
export const createCommodityController = function (
  getSessionValue = defaultGetSessionValue,
  setSessionValue = defaultSetSessionValue,
  validationSchema = commoditySchema
) {
  return {
    get: {
      handler(request, h) {
        const pageModel = getSessionValue(request, 'pageModel') || {}
        const viewModel = buildCommodityViewModel(pageModel)
        return h.view('import/views/commodity', viewModel)
      },
      options: {}
    },
    post: {
      handler(request, h) {
        const { error } = validationSchema.validate(request.payload)
        if (error) {
          /* Re-render with errors */
        }
        return h.redirect('/import/transport')
      },
      options: {}
    }
  }
}

// Production export (uses real dependencies)
export const commodityController = createCommodityController()
```

**Benefits:** Tests can inject mocks (`createCommodityController(mockGet, mockSet, mockSchema)`), production uses real implementations, no need to mock Hapi internals.

**Route Registration:**

```javascript
import { commodityController } from './controllers/commodity.js'

export const importJourney = {
  plugin: {
    name: 'import-journey',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/import/commodity',
          ...commodityController.get,
          options: {
            ...commodityController.get.options,
            auth: 'session'
          }
        },
        {
          method: 'POST',
          path: '/import/commodity',
          ...commodityController.post,
          options: {
            ...commodityController.post.options,
            auth: 'session'
          }
        }
        // ... other screens
      ])
    }
  }
}
```

**Registration Flow:**

```
Server.js
    ↓ registers
Plugins Array (src/plugins/index.js)
    ├── Infrastructure plugins (auth, session, csrf, ...)
    └── Router plugin (src/plugins/router.js)
            ↓ registers
        Feature plugins
            ├── health
            ├── auth (routes)
            ├── dashboard
            ├── importJourney
            └── serveStaticFiles
```

**Critical ordering:** `session` before `auth` (Cookie strategy needs Yar), `auth` before `router` (Routes reference strategies).

### Directory Structure

```
src/
├── plugins/                        # INFRASTRUCTURE LAYER
│   ├── index.js                    # Central plugin array
│   ├── auth.js                     # Auth strategies (Bell, Cookie)
│   ├── auth/
│   │   └── defra-id-strategy.js    # Bell provider config
│   ├── session.js                  # Yar (Redis sessions)
│   ├── csrf.js                     # CSRF protection (@hapi/crumb)
│   ├── router.js                   # Route aggregation plugin
│   ├── request-logger.js           # Request logging
│   ├── request-tracing.js          # CDP trace ID generation
│   └── ...
│
├── server/                         # APPLICATION LAYER
│   ├── import/                     # 'import-journey' plugin
│   │   ├── index.js                # Plugin exports + route registration
│   │   ├── controllers/
│   │   │   ├── commodity.js        # Factory + default export
│   │   │   ├── transport.js
│   │   │   ├── arrival.js
│   │   │   ├── parties.js
│   │   │   ├── review.js
│   │   │   └── confirmation.js
│   │   ├── validators/
│   │   │   └── schemas.js          # Joi schemas
│   │   ├── helpers/
│   │   │   └── view-models.js      # Template data builders
│   │   └── views/
│   │       ├── commodity.njk
│   │       ├── transport.njk
│   │       ├── arrival.njk
│   │       ├── parties.njk
│   │       ├── review.njk
│   │       └── confirmation.njk
│   │
│   ├── dashboard/                  # 'dashboard' plugin
│   │   ├── index.js
│   │   ├── controller.js
│   │   └── index.njk
│   │
│   ├── auth/                       # 'auth-routes' plugin
│   │   └── index.js                # Login/logout routes
│   │
│   ├── health/                     # 'health' plugin
│   │   ├── index.js
│   │   └── controller.js
│   │
│   ├── common/                     # Shared utilities
│   │   ├── helpers/
│   │   │   ├── session-helpers.js  # getSessionValue(), setSessionValue()
│   │   │   ├── errors.js
│   │   │   └── request-tracing.js
│   │   ├── templates/
│   │   │   ├── layouts/
│   │   │   │   └── page.njk        # GOV.UK base layout
│   │   │   └── partials/
│   │   └── constants/
│   │       └── status-codes.js
│   │
│   └── server.js                   # Server factory
│
└── config/
    ├── config.js                   # Convict config loader
    ├── ipaffs-vnet-data.js         # Test data
    └── nunjucks/
        └── nunjucks.js             # Template engine config
```

## Session Management

**Redis Storage:** Session data stored in Redis with keys following pattern `trade-demo-frontend:!@hapi/yar:{uuid}` (URL-encoded as `trade-demo-frontend:!%40hapi%2Fyar:{uuid}`), where UUID is session identifier encrypted in browser's session cookie using Iron format (`Fe26.2**...`). Yar plugin manages mapping between cookie's encrypted session ID and corresponding Redis key, storing entire pageModel as JSON value with 4-hour sliding TTL. To inspect sessions locally, run `./scripts/inspect-redis-sessions.sh`.

### Configuration

Redis-backed sessions via `@hapi/yar` from `src/plugins/session.js`:

```javascript
export const session = {
  name: 'session',
  plugin: yar,
  options: {
    name: config.get('session.cache.name'), // 'session'
    cache: {
      cache: config.get('session.cache.name'),
      expiresIn: config.get('session.cache.ttl') // 14400000 (4 hours)
    },
    storeBlank: false,
    cookieOptions: {
      password: config.get('session.cookie.password'), // Min 32 chars
      ttl: config.get('session.cookie.ttl'), // 14400000 (4 hours)
      isSecure: config.get('session.cookie.secure'), // true in production
      isSameSite: 'Lax', // ← CRITICAL for CDP OIDC compatibility
      clearInvalid: true
    }
  }
}
```

**CDP-Specific Configuration:**

- **`isSameSite: 'Lax'`** (CRITICAL): Required for OIDC login flow in CDP platform. Enables session cookie to be sent during OAuth redirect callback from Defra ID. Using `'Strict'` would block cookie during cross-site navigation, breaking authentication.

- **Redis key structure**: `{keyPrefix}:session:{uuid}` (e.g., `trade-demo-frontend:session:a3b2c1d4-e5f6-7890-abcd-ef1234567890`). Key prefix configured via `REDIS_KEY_PREFIX` environment variable to enable multiple apps sharing Redis without collision.

- **Iron encryption**: Session cookies use Iron v2 format (`Fe26.2**...`). Password must be 32+ characters. CDP platform provides via `SESSION_COOKIE_PASSWORD` environment variable.

**Session Lifecycle:** TTL 4 hours (sliding window - refreshed on each request). Storage: Redis in production, memory in development. Expiry handling: Guard redirects send users to start if session expired.

### Flat PageModel Structure

**IMPORTANT**: Session uses **flat pageModel** structure (not nested Journey Model). Simplifies session management by avoiding deep object merging.

**Session helpers** from `src/server/common/helpers/session-helpers.js`:

- `getSessionValue(request, key)` - retrieve value from session
- `setSessionValue(request, key, value)` - store value in session
- `clearSessionValue(request, key)` - remove specific key
- `resetSession(request)` - clear entire session

### PageModel Accumulation Pattern

The `pageModel` object accumulates data as user progresses:

**After Screen 1:**

```javascript
{
  numberOfAnimals: 12,
  certificationPurpose: 'Breeding'
}
```

**After Screen 2:**

```javascript
{
  numberOfAnimals: 12,
  certificationPurpose: 'Breeding',
  transportMode: 'AIR',
  journeyDurationHours: 5
}
```

**Controller Pattern:**

```javascript
// GET existing pageModel
const pageModel = getSessionValue(request, 'pageModel') || {}

// Add/update new fields
pageModel.transportMode = transportMode
pageModel.journeyDurationHours = parseInt(journeyDurationHours, 10)

// Save back to session
setSessionValue(request, 'pageModel', pageModel)
```

## Form Patterns

### Validation

Joi schema example:

```javascript
const screen1Schema = Joi.object({
  numberOfAnimals: Joi.number().integer().min(1).max(9999).required().messages({
    'number.base': 'Enter the number of animals',
    'number.min': 'Number of animals must be at least 1',
    'number.max': 'Number of animals cannot exceed 9999',
    'any.required': 'Enter the number of animals'
  }),
  certificationPurpose: Joi.string()
    .valid('Breeding', 'Production', 'Slaughter')
    .required()
    .messages({
      'any.only': 'Select how the animals will be certified',
      'any.required': 'Select how the animals will be certified'
    })
})
```

### Error Handling

Joi validation errors transformed into two GOV.UK structures by `formatValidationErrors()` in `src/server/import/helpers/view-models.js`:

```javascript
const formatValidationErrors = (error) => {
  // 1. Error summary list (for GOV.UK error summary component)
  const errorList = error.details.map((err) => ({
    text: err.message,
    href: `#${err.path[0]}` // Links to field anchor
  }))

  // 2. Field-level errors (for inline display next to inputs)
  const fieldErrors = {}
  error.details.forEach((err) => {
    const fieldName = err.path[0]
    const errorKey = `${fieldName}Error` // Naming convention: {fieldName}Error
    fieldErrors[errorKey] = { text: err.message }
  })

  return { errorList, fieldErrors }
}
```

**Example output:**

```javascript
{
  errorList: [
    { text: 'Enter the number of animals', href: '#numberOfAnimals' }
  ],
  fieldErrors: {
    numberOfAnimalsError: { text: 'Enter the number of animals' }
  }
}
```

**Template usage:**

```nunjucks
{% if errors %}
  {{ govukErrorSummary({
    titleText: "There is a problem",
    errorList: errors
  }) }}
{% endif %}

{{ govukInput({
  id: "numberOfAnimals",
  name: "numberOfAnimals",
  label: { text: "Number of animals" },
  errorMessage: errors.numberOfAnimals,
  value: formData.numberOfAnimals
}) }}
```

Templates receive both structures: `errorList` → GOV.UK error summary at top, `{fieldName}Error` → Inline error next to specific field.

### CSRF Protection

**CRITICAL**: All POST forms MUST include CSRF token to prevent 403 Forbidden errors. Token name is **`crumb`** (not `csrfToken` - using wrong name causes 403 errors).

```nunjucks
<form method="post" novalidate>
  <input type="hidden" name="crumb" value="{{ crumb }}" />
  <!-- form fields -->
</form>
```

**Implementation:** CSRF protection via `@hapi/crumb` plugin. Token name: `crumb` (NOT `csrfToken`). Automatically validated on POST requests. Tokens added to view context by Hapi.

### View Model Builders

Templates contain zero business logic. Controllers call view builders that prepare all template data.

All view builders located in `src/server/import/helpers/view-models.js`.

**Example builder:**

```javascript
export const buildCommodityViewModel = (pageModel, validationError = null) => {
  const formattedErrors = validationError
    ? formatValidationErrors(validationError)
    : null

  return {
    // Page metadata
    pageTitle: 'What animals are you importing?',
    heading: 'What animals are you importing?',

    // Reference data (from config/ipaffs-vnet-data.js)
    commodity: {
      species: ipaffsVnetData.commodity.speciesName, // 'Bos taurus'
      commonName: ipaffsVnetData.commodity.speciesCommonName, // 'Cattle'
      code: ipaffsVnetData.commodity.commodityID, // '0102'
      countryOfOrigin: ipaffsVnetData.defaults.countryOfOriginName // 'France'
    },

    // Form values (repopulate from pageModel)
    formValues: {
      numberOfAnimals: pageModel.numberOfAnimals || '',
      certificationPurpose: pageModel.certificationPurpose || ''
    },

    // Radio/select options
    certificationOptions: [
      { value: 'Breeding', text: 'Breeding' },
      { value: 'Production', text: 'Production' },
      { value: 'Slaughter', text: 'Slaughter' }
    ],

    // Error structures (if validation failed)
    ...(formattedErrors && {
      errorList: formattedErrors.errorList,
      ...formattedErrors.fieldErrors
    })
  }
}
```

**Date field handling** (for GOV.UK date input component):

```javascript
// Split ISO date for template rendering
let day = '',
  month = '',
  year = ''
if (pageModel.arrivalDate) {
  const [y, m, d] = pageModel.arrivalDate.split('-')
  year = y
  month = m
  day = d
}

// Return as dateItems array for GOV.UK date input
dateItems: [
  { name: 'day', value: day },
  { name: 'month', value: month },
  { name: 'year', value: year }
]
```

## Local Development

**Authentication Flow:** Authentication is split out into its own document (see [oauth-oidc.md](oauth-oidc.md))

**User Registration:**

```bash
make register-user
```

Creates test user in local OIDC stub for authentication during development. User matches pre-registered user Kai in IPAFFS environment vNet.

**Session Inspection:** Run `./scripts/inspect-redis-sessions.sh` to decode Redis keys and pretty-print session values.
