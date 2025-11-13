# Live Animal Import Journey - Screen Specifications

## Technology Stack

- **Backend**: Hapi.js (Node.js)
- **Templates**: Nunjucks
- **Design System**: GOV.UK Design System
- **Forms**: GOV.UK Frontend components
- **Validation**: Joi (server-side) + GOV.UK error patterns (`src/server/import/validators/schemas.js`)
- **Session Management**: @hapi/yar with Redis backend (`src/server/common/helpers/session-helpers.js`)
- **Authentication**: @hapi/bell (OAuth2/OIDC) [oauth-oidc.md](oauth-oidc.md)

## Project Layout and HAPIs Plugin Architecture

This application follows Hapi.js plugin architecture to achieve separation of concerns between infrastructure and application domains.

### Two-Layer Architecture

- plugins/ = Infrastructure layer (auth, sessions, routing infrastructure)
- server/ = Applications layer (import journey app, dashboard app, examples app)

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
│ • examples/        → Example forms                          │
│ • health/          → Health check endpoint                  │
└─────────────────────────────────────────────────────────────┘
```

**Key principle:** Infrastructure plugins provide capabilities (strategies, sessions, CSRF tokens).
Feature plugins consume those capabilities to implement business logic.

### Plugin Export Pattern

All plugins follow the same structure:

```javascript
export const pluginName = {
  plugin: {
    name: 'plugin-name', // Hapi plugin identifier
    register(server) {
      // OR async register(server) for infra plugins
      // Plugin logic: either server.route([...]) or await server.register([...])
    }
  }
}
```

**Two registration patterns:**

1. **Infrastructure plugins** register other plugins and configure strategies:

   ```javascript
   async register(server) {
     await server.register([Bell, Cookie])          // Register 3rd party plugins
     server.auth.strategy('session', 'cookie', {    // Configure strategy
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

### Feature Plugin Deep Dive: Import Journey

The import journey is implemented as **one plugin** that registers all journey routes.
This follows the CDP pattern of "one plugin per user journey" (not one plugin per page).

#### Why as a Plugin?

1. **Encapsulation** - All import journey routes, controllers, validators, views live in `src/server/import/`
2. **Clear boundaries** - Plugin name (`import-journey`) maps to user-facing journey
3. **Composability** - Can be registered/unregistered as a unit
4. **Testability** - Integration tests can test the entire journey flow
5. **Reusability** - Could be extracted to a separate npm package if needed

#### How Routes are Exported

Controllers use a **factory pattern** for dependency injection:

```javascript
// src/server/import/controllers/commodity.js

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
          // Re-render with errors
        }
        // Save to session and redirect
        return h.redirect('/import/transport')
      },
      options: {}
    }
  }
}

// Production export (uses real dependencies)
export const commodityController = createCommodityController()
```

**Benefits:**

- Tests can inject mocks: `createCommodityController(mockGet, mockSet, mockSchema)`
- Production code uses real implementations
- No need to mock Hapi internals or session objects

#### How Routes are Registered in Plugin

The plugin spreads controller handlers into route definitions:

```javascript
// src/server/import/index.js

import { commodityController } from './controllers/commodity.js'
import { transportController } from './controllers/transport.js'
// ... other controllers

export const importJourney = {
  plugin: {
    name: 'import-journey',
    register(server) {
      server.route([
        // Commodity screen
        {
          method: 'GET',
          path: '/import/commodity',
          ...commodityController.get, // Spreads handler + options
          options: {
            ...commodityController.get.options,
            auth: 'session' // Add/override auth requirement
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

        // ... other screens, arrival, parties, review, confirmation routes
      ])
    }
  }
}
```

**Key patterns:**

- Spread operator (`...controller.get`) injects `handler` and `options`
- Route-level options override controller options (auth strategy)
- All journey routes registered in one plugin

#### How Plugin is Registered

Registration flows through multiple layers:

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
            ├── importJourney   ← registers all import routes
            ├── examples
            └── serveStaticFiles
```

**Code flow:**

1. **Feature plugin exports:**

   ```javascript
   // src/server/import/index.js
   export const importJourney = { plugin: { name: 'import-journey', register() {...} } }
   ```

2. **Router plugin imports and registers:**

   ```javascript
   // src/plugins/router.js
   import { importJourney } from '../server/import/index.js'

   export const router = {
     plugin: {
       name: 'router',
       async register(server) {
         await server.register([health])
         await server.register([auth]) // Auth routes (login/logout)
         await server.register([dashboard])
         await server.register([importJourney]) // ← Import journey registered here
         await server.register([examples, createName, createValue, edit])
         await server.register([serveStaticFiles])
       }
     }
   }
   ```

3. **Plugins array includes router:**

   ```javascript
   // src/plugins/index.js
   export const plugins = [
     requestLogger,
     requestTracing,
     secureContext,
     pulse, // Metrics
     session, // Yar (must come before auth)
     nunjucksConfig,
     csrf,
     Scooter,
     contentSecurityPolicy,
     auth, // Auth strategies (must come before router)
     router // Routes (references auth strategies)
   ]
   ```

4. **Server registers plugins array:**
   ```javascript
   // src/server/server.js
   await server.register(plugins)
   ```

**Critical ordering:**

- `session` before `auth` (Cookie strategy needs Yar)
- `auth` before `router` (Routes reference strategies like `'session'`)

### Directory Structure

```
src/
├── plugins/                        # INFRASTRUCTURE LAYER
│   ├── index.js                    # Central plugin array
│   ├── auth.js                     # 'auth' - Auth strategies (Bell, Cookie)
│   ├── auth/
│   │   └── defra-id-strategy.js    # Bell provider config
│   ├── session.js                  # Yar (Redis sessions)
│   ├── csrf.js                     # CSRF protection (@hapi/crumb)
│   ├── router.js                   # Route aggregation plugin
│   ├── request-logger.js           # Request logging
│   ├── request-tracing.js          # CDP trace ID generation
│   └── ...                         # Other cross-cutting concerns
│
├── server/                         # APPLICATION LAYER (domain-driven)
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
│   │   │   └── schemas.js          # Joi schemas (commoditySchema, etc.)
│   │   ├── helpers/
│   │   │   └── view-models.js      # Template data builders
│   │   └── views/
│   │       ├── commodity.njk       # Nunjucks templates
│   │       ├── transport.njk
│   │       ├── arrival.njk
│   │       ├── parties.njk
│   │       ├── review.njk
│   │       └── confirmation.njk
│   │
│   ├── dashboard/                  # 'dashboard' plugin (simple)
│   │   ├── index.js                # Plugin + route
│   │   ├── controller.js           # Single handler
│   │   └── index.njk
│   │
│   ├── auth/                       # 'auth-routes' plugin
│   │   └── index.js                # Login/logout routes
│   │
│   ├── examples/                   # 'examples' plugin (nested)
│   │   ├── index.js                # Parent plugin
│   │   ├── controller.js
│   │   ├── create-name/            # Child plugin
│   │   │   ├── index.js
│   │   │   ├── controller.js
│   │   │   └── index.njk
│   │   ├── create-value/           # Child plugin
│   │   └── edit/                   # Child plugin
│   │
│   ├── health/                     # 'health' plugin
│   │   ├── index.js
│   │   └── controller.js
│   │
│   ├── common/                     # Shared utilities
│   │   ├── helpers/
│   │   │   ├── session-helpers.js  # getSessionValue(), setSessionValue()
│   │   │   ├── errors.js
│   │   │   ├── request-tracing.js
│   │   │   └── ...
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

## Authentication Flow

Authentication is split out into its own document (see [oauth-oidc.md](oauth-oidc.md))

## Local Development Setup

**User Registration:**

```bash
make register-user
```

This creates a test user in the local OIDC stub for authentication during development.
The user matches a pre-registered user Kai in the IPAFFS environment vNet.

---

## Visual Design Patterns

Taken from the CDP standard GovUK Design System

---

## Accessibility Requirements

Taken from the CDP standard GovUK Design System

---

## Route Structure for pages under the import domain (Example)

| Screen | Route                                  | Methods   | Purpose                 |
| ------ | -------------------------------------- | --------- | ----------------------- |
| 1      | `/import/commodity`                    | GET, POST | Animals & commodity     |
| 2      | `/import/transport`                    | GET, POST | Transport details       |
| 3      | `/import/arrival`                      | GET, POST | Arrival date/time/BCP   |
| 4      | `/import/parties`                      | GET, POST | Consignor + Consignee   |
| 5      | `/import/review`                       | GET, POST | Review summary & submit |
| 6      | `/import/confirmation/{chedReference}` | GET       | Confirmation page       |

## Validation schemas for each page live under `src/server/import/validators/schemas.js`:

## Session Management

### Flat PageModel Structure

**IMPORTANT**: The session uses a **flat pageModel** structure (not the nested Journey Model documented in LIVE_ANIMAL_JOURNEY_MODEL.md). This simplifies session management by avoiding deep object merging.

Session helpers from `src/server/common/helpers/session-helpers.js`:

- `getSessionValue(request, key)` - retrieve value from session
- `setSessionValue(request, key, value)` - store value in session
- `clearSessionValue(request, key)` - remove specific key
- `resetSession(request)` - clear entire session

### PageModel Evolution Through Journey

The `pageModel` object accumulates data as the user progresses through screens:

**After Screen 1 (Commodity)**:

```javascript
{
  numberOfAnimals: 12,
  certificationPurpose: 'Breeding'
}
```

**After Screen 2 (Transport)**:

```javascript
{
  numberOfAnimals: 12,
  certificationPurpose: 'Breeding',
  transportMode: 'AIR',
  journeyDurationHours: 5
}
```

**After Screen 3 (Arrival)**:

```javascript
{
  numberOfAnimals: 12,
  certificationPurpose: 'Breeding',
  transportMode: 'AIR',
  journeyDurationHours: 5,
  bcpCode: 'GBAPHA1A',
  arrivalDate: '2025-11-15',
  arrivalTime: '22:00'
}
```

**After Screen 4 (Parties)**:

```javascript
{
  numberOfAnimals: 12,
  certificationPurpose: 'Breeding',
  transportMode: 'AIR',
  journeyDurationHours: 5,
  bcpCode: 'GBAPHA1A',
  arrivalDate: '2025-11-15',
  arrivalTime: '22:00',
  consignorId: '8f2fac7f-e1c2-4d4a-832c-cce29afbf9d3',
  consigneeId: '94898d01-fc90-45f8-97d9-be6391aab2c6'
}
```

**After Screen 5 (Review) - Submission**:

```javascript
// pageModel cleared to prevent resubmission
{
  pageModel: null,
  chedReference: 'CHEDP.GB.2025.1234567'  // Persists for confirmation screen
}
```

### Session Accumulation Pattern

Controllers follow this pattern to accumulate data:

```javascript
// GET existing pageModel
const pageModel = getSessionValue(request, 'pageModel') || {}

// Add/update new fields
pageModel.transportMode = transportMode
pageModel.journeyDurationHours = parseInt(journeyDurationHours, 10)

// Save back to session
setSessionValue(request, 'pageModel', pageModel)
```

### Session Lifecycle

- **Save**: On each POST (after successful validation)
- **Clear**: After submission (`pageModel` set to null, `chedReference` persists)
- **Resume**: On browser refresh (if session active and not expired)
- **Expiry**: 4 hours (configurable via `session.cache.ttl`)

---

## Form Validation Pattern

### Error Message Structure

Joi validation errors are transformed into two GOV.UK structures by `formatValidationErrors()` in `src/server/import/helpers/view-models.js`:

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

**Example output**:

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

Templates receive both structures and use them appropriately:

- `errorList` → GOV.UK error summary at top of page
- `{fieldName}Error` → Inline error message next to specific field

### CSRF Protection

**CRITICAL**: All POST forms MUST include CSRF token to prevent 403 Forbidden errors.

Token name is **`crumb`** (not `csrfToken` - using wrong name causes 403 errors).

```nunjucks
<form method="post" novalidate>
  <input type="hidden" name="crumb" value="{{ crumb }}" />

  <!-- form fields -->
</form>
```

**Implementation:**

- CSRF protection via `@hapi/crumb` plugin
- Token name: `crumb` (NOT `csrfToken`)
- Automatically validated on POST requests
- Tokens added to view context by Hapi

### Server-Side (Joi Schema Example)

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

### Error Display (Nunjucks)

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

---

## IPAFFS Integration

### Submit Flow

1. User clicks "Submit notification" on review screen
2. POST to `/import/submit` with confirmation
3. Backend transforms journey model → CHED JSON
4. Backend augments with hardcoded config (IDs, traces IDs, etc.)
5. POST to IPAFFS API endpoint
6. Receive CHED reference in response
7. Redirect to `/import/confirmation/{chedReference}`

### Draft Flow

1. User clicks "Save as draft"
2. POST to `/import/draft`
3. Save journey state to database with status: "DRAFT"
4. Return draft ID to user (optional: show confirmation)

---

## Configuration Data Structure

```javascript
// config/ipaffs-vnet-data.js
module.exports = {
  personResponsible: {
    userId: 'c9606501-44fe-ea11-a813-000d3aaa467a',
    contactId: 'c9606501-44fe-ea11-a813-000d3aaa467a',
    companyId: '0de0606e-46fe-ea11-a813-000d3aaa467a',
    contactName: 'Kai Atkinson',
    companyName: 'Kai Inc.',
    address: {
      lines: ['UNCANNY COMICS', '3 TARRING ROAD', 'WORTHING', 'BN11 4SS']
    },
    email: 'kaiatkinson@jourrapide.com',
    phone: '0123456788',
    country: 'GB',
    tracesID: 1001
  },

  consignors: [
    {
      id: '8f2fac7f-e1c2-4d4a-832c-cce29afbf9d3',
      companyName: 'Astra Rosales',
      country: 'CH',
      countryName: 'Switzerland',
      address: {
        lines: [
          '43 East Hague Extension',
          'Delectus sit odio p',
          'Laborum Odio tempor'
        ],
        city: 'Quas occaecat ut ear',
        postalCode: '30055'
      },
      email: 'revoje@mailinator.net',
      phone: '01783 772587',
      tracesId: 10056664
    }
    // Add more consignors for dropdown
  ],

  consignees: [
    {
      id: '94898d01-fc90-45f8-97d9-be6391aab2c6',
      companyName: 'Linus George Ltd',
      country: 'GB',
      countryName: 'United Kingdom',
      address: {
        lines: [
          '558 Oak Street',
          'Ut aperiam in volupt',
          'Nisi tempore aliqua'
        ],
        city: 'Eligendi et beatae p',
        postalCode: '24271'
      },
      email: 'momazycy@mailinator.net',
      phone: '01783 983022',
      tracesId: 10056663
    }
    // Add more consignees for dropdown
  ],

  transporter: {
    id: 'b8625677-e7cd-4a8e-95bd-9d5a6c91a0c3',
    companyName: 'ALISTAIR WILSON',
    approvalNumber: 'UK/INVER/T1/00091851',
    tracesId: 10146433
  },

  commodity: {
    commodityID: '0102',
    commodityDescription: 'Live bovine animals',
    speciesID: '1148346',
    speciesName: 'Bos taurus',
    speciesCommonName: 'Cattle',
    speciesTypeName: 'Domestic',
    speciesType: '16',
    speciesClass: '749313'
  },

  bcps: [
    { code: 'GBAPHA1A', name: 'Ashford (Dover)', portCode: 'GBLGW' },
    { code: 'GBHEA1', name: 'Heathrow', portCode: 'GBHEA' }
  ],

  defaults: {
    cphNumber: '12/345/6789',
    purposeGroup: 'For Import',
    internalMarketPurpose: 'Production',
    countryOfOrigin: 'FR'
  }
}
```

---

## Technical Architecture

### Data Model Architecture

This application manages three distinct data representations:

1. **Page Model** (Frontend - Redis Session)

   - Flat key-value structure stored in user session
   - Mirrors form input fields exactly
   - Managed by @hapi/yar session plugin
   - Example: `{ numberOfAnimals: "12", certificationPurpose: "Breeding" }`

2. **Journey Model** (Backend - Domain Model)

   - Nested domain model representing business concepts
   - Transforms page model into business entities
   - Defined in `docs/LIVE_ANIMAL_JOURNEY_MODEL.md`
   - Example: `{ consignment: { animals: { numberOfAnimals: 12, ... } } }`

3. **CHED Model** (IPAFFS Technical Format)
   - IPAFFS-specific JSON structure
   - Backend transforms journey model → CHED for API submission
   - Example structure in `docs/draft-cheda-*.json`

**This prototype focuses on page model only**. The confirmation screen will display the collected page model as JSON. Backend transformation to journey model and CHED is out of scope.

### CDP-Standard Application Structure

Following CDP conventions from `cdp-node-frontend-template`:

```
src/
├── index.js                      # Application entry point
├── server/
│   ├── index.js                  # Server setup and plugin registration
│   ├── router.js                 # Central route registration
│   ├── health/
│   │   └── index.js              # Health check endpoint
│   ├── common/
│   │   ├── helpers/
│   │   │   ├── session.js        # Session utilities
│   │   │   └── view-builders.js  # Template data preparation
│   │   └── templates/
│   │       └── layouts/
│   │           └── page.njk      # GOV.UK Design System layout
│   └── import/                   # Feature module
│       ├── index.js              # Route definitions
│       ├── controllers/
│       │   ├── commodity.js      # Screen 1 controller
│       │   ├── transport.js      # Screen 2 controller
│       │   ├── arrival.js        # Screen 3 controller
│       │   ├── origin.js         # Screen 4 controller
│       │   ├── destination.js    # Screen 5 controller
│       │   ├── review.js         # Screen 6 controller
│       │   ├── submit.js         # Submit handler
│       │   └── confirmation.js   # Screen 7 controller
│       ├── helpers/
│       │   ├── build-review.js   # Build review summary
│       │   └── format-options.js # Format dropdown options
│       └── views/
│           ├── commodity.njk
│           ├── transport.njk
│           ├── arrival.njk
│           ├── origin.njk
│           ├── destination.njk
│           ├── review.njk
│           └── confirmation.njk
├── config/
│   ├── index.js                  # Environment config loader
│   └── ipaffs-vnet-data.js       # Hardcoded IPAFFS vNet data
└── validators/
    └── journey-schemas.js         # Joi validation schemas
```

### Feature Module Pattern

Each feature is self-contained with co-located routes, controllers, helpers, and views.

## Multi-Page Journey Architecture

**Based on CDP frontend patterns from production applications (cdp-portal-frontend, assurance-frontend)**

### Journey Plugin Granularity: One Plugin Per Journey

**CRITICAL PATTERN**: Multi-page journeys are organized as **one plugin that registers all journey routes**, NOT one plugin per page.

```javascript
// ✅ CORRECT - One plugin for entire journey
export const importJourney = {
  plugin: {
    name: 'import-journey',
    register(server) {
      server.route([
        { method: 'GET', path: '/import/commodity', ... },
        { method: 'POST', path: '/import/commodity', ... },
        { method: 'GET', path: '/import/transport', ... },
        { method: 'POST', path: '/import/transport', ... },
        { method: 'GET', path: '/import/arrival', ... },
        { method: 'POST', path: '/import/arrival', ... },
        // ... all journey steps in one plugin
      ])
    }
  }
}
```

```javascript
// ❌ WRONG - Don't create separate plugins for each page
export const commodityPage = { plugin: { name: 'commodity', ... } }
export const transportPage = { plugin: { name: 'transport', ... } }
export const arrivalPage = { plugin: { name: 'arrival', ... } }
```

**Rationale:**

- Encapsulation: All related routes grouped together
- Clear boundaries: One plugin = one user journey
- Easier navigation: All journey URLs in one place
- Simplified testing: Test entire journey flow in one test suite

### Journey State Management Patterns

CDP frontends use two session management approaches:

#### Pattern A: Flat Page Model (Current Implementation)

**Use for**: Simple linear journeys with no branching

```javascript
// Session key: 'pageModel'
// Stored via: request.yar.set('pageModel', data)
{
  // Step 1 data
  numberOfAnimals: 12,
  certificationPurpose: 'Breeding',

  // Step 2 data
  transportMode: 'AIR',
  journeyDurationHours: 5,

  // Step 3 data
  bcpCode: 'GBAPHA1A',
  arrivalDate: '2025-11-15',
  arrivalTime: '22:00'
}
```

**Implementation:**

```javascript
// Save step data
const pageModel = getSessionValue(request, 'pageModel') || {}
pageModel.numberOfAnimals = parseInt(numberOfAnimals, 10)
pageModel.certificationPurpose = certificationPurpose
setSessionValue(request, 'pageModel', pageModel)

// Navigate to next step
return h.redirect('/import/transport')
```

#### Pattern B: Step Completion Tracking (CDP Multistep Form)

**Use for**: Complex journeys with progress indicators and conditional branching

```javascript
// Session key: UUID (passed in URL)
// Stored via: request.yar.set(journeyId, data)
{
  id: 'uuid-for-this-journey-instance',

  // Form data
  numberOfAnimals: 12,
  certificationPurpose: 'Breeding',
  transportMode: 'AIR',

  // Step completion tracking
  isComplete: {
    stepOne: true,    // Commodity completed
    stepTwo: false,   // Transport not started
    stepThree: false  // Arrival not started
  },

  // Navigation metadata
  button: 'next' | 'save' | 'back'
}
```

**Benefits of Pattern B:**

- Support multiple concurrent journeys (different tabs)
- Progress indicators (2 of 5 steps complete)
- Access control (can't skip to step 3 if step 1 incomplete)
- Save draft functionality

**Implementation:** CDP Portal Frontend provides reusable `multistep-form` helper plugin (see cdp-portal-frontend/src/server/common/helpers/multistep-form/)

### Navigation Flow Pattern

All CDP journeys use **controller-driven navigation** via redirects:

```javascript
// POST handler pattern
export const createCommodityController = function(...) {
  return {
    post: {
      handler(request, h) {
        const { numberOfAnimals, certificationPurpose } = request.payload

        // 1. Validate input
        const { error } = validationSchema.validate({ numberOfAnimals, certificationPurpose })
        if (error) {
          // Re-render form with errors
          return h.view('import/views/commodity', viewModel).code(400)
        }

        // 2. Save to session
        const pageModel = getSessionValue(request, 'pageModel') || {}
        pageModel.numberOfAnimals = parseInt(numberOfAnimals, 10)
        pageModel.certificationPurpose = certificationPurpose
        setSessionValue(request, 'pageModel', pageModel)

        // 3. Navigate to next step
        return h.redirect('/import/transport')
      }
    }
  }
}
```

### Guard Redirects (Prevent Step Skipping)

Each screen checks **all previous required fields** (cumulative checks). If any are missing, redirects to start.

**Guard Redirect Checklist**:

| Screen           | Required Fields from Previous Screens                                                           | Redirects to        |
| ---------------- | ----------------------------------------------------------------------------------------------- | ------------------- |
| 1 (Commodity)    | None                                                                                            | N/A                 |
| 2 (Transport)    | numberOfAnimals, certificationPurpose                                                           | `/import/commodity` |
| 3 (Arrival)      | Screen 1 + 2 fields: numberOfAnimals, certificationPurpose, transportMode, journeyDurationHours | `/import/commodity` |
| 4 (Parties)      | Screens 1-3 fields: above + bcpCode, arrivalDate, arrivalTime                                   | `/import/commodity` |
| 5 (Review)       | Screens 1-4 fields: above + consignorId, consigneeId                                            | `/import/commodity` |
| 6 (Confirmation) | chedReference (not pageModel)                                                                   | `/import/commodity` |

**Pattern**: All redirects go to `/import/commodity` (first screen), not dynamically to "first incomplete step".

**Implementation** (example from `src/server/import/controllers/transport.js`):

```javascript
export const createTransportController = function(getSessionValue = ...) {
  return {
    get: {
      handler(request, h) {
        const pageModel = getSessionValue(request, 'pageModel') || {}

        // Guard: ensure step 1 (commodity) is complete
        if (!pageModel.numberOfAnimals || !pageModel.certificationPurpose) {
          return h.redirect('/import/commodity')
        }

        const viewModel = buildTransportViewModel(pageModel)
        return h.view('import/views/transport', viewModel)
      }
    }
  }
}
```

**Benefits:**

- Prevents URL bookmarking bypassing steps
- Handles session expiry gracefully
- Browser back button works correctly (loads data from session)
- Simple implementation (no step tracking state machine)

### Session Configuration

**Redis-backed sessions** (production) via `@hapi/yar` from `src/plugins/session.js`:

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
      password: config.get('session.cookie.password'), // Min 32 chars (from env)
      ttl: config.get('session.cookie.ttl'), // 14400000 (4 hours)
      isSecure: config.get('session.cookie.secure'), // true in production
      isSameSite: 'Lax', // ← CRITICAL for CDP OIDC compatibility
      clearInvalid: true
    }
  }
}
```

**CDP-Specific Configuration**:

- **`isSameSite: 'Lax'`** (CRITICAL): Required for OIDC login flow in CDP platform

  - Enables session cookie to be sent during OAuth redirect callback from Defra ID
  - Using `'Strict'` would block the cookie during cross-site navigation, breaking authentication
  - This is different from the auth cookie which can be `'Strict'` (temporary, local to OAuth flow)

- **Redis key structure**: `{keyPrefix}:session:{uuid}`

  - Example: `trade-demo-frontend:session:a3b2c1d4-e5f6-7890-abcd-ef1234567890`
  - Key prefix configured via `REDIS_KEY_PREFIX` environment variable
  - Enables multiple apps to share Redis without key collision

- **Iron encryption**: Session cookies use Iron v2 format (`Fe26.2**...`)
  - Password must be 32+ characters (enforced in config validation)
  - CDP platform provides password via `SESSION_COOKIE_PASSWORD` environment variable

**Session Lifecycle**:

- TTL: 4 hours (sliding window - refreshed on each request)
- Storage: Redis in production, memory in development
- Expiry handling: Guard redirects send users back to start if session expired

### File Organization for Journeys

**CDP Standard Structure:**

```
import/                              # Journey directory
├── index.js                         # Plugin registration (all routes)
├── controllers/
│   ├── commodity.js                 # Step 1: GET/POST handlers
│   ├── commodity.test.js            # Unit tests
│   ├── transport.js                 # Step 2: GET/POST handlers
│   ├── transport.test.js
│   ├── arrival.js                   # Step 3: GET/POST handlers
│   ├── summary.js                   # Review/submit handlers
│   └── confirmation.js              # Confirmation page
├── helpers/
│   ├── view-models.js               # View builders for all steps
│   ├── journey-steps.js             # Step config (if using multistep-form)
│   └── save-step-data.js            # State management helpers
├── validators/
│   └── schemas.js                   # Joi validation schemas
├── views/
│   ├── commodity.njk
│   ├── transport.njk
│   ├── arrival.njk
│   ├── summary.njk
│   └── confirmation.njk
└── index.integration.test.js        # Journey integration tests
```

### Edge Cases to Handle

1. **Session Expiry**: Journey data expires after TTL (typically 1 hour)

   - **Handling**: Show "Session expired" message, redirect to journey start
   - **Prevention**: Extend TTL on each request via `await request.yar.commit(h)`

2. **Direct URL Access**: User bookmarks intermediate step URL

   - **Handling**: Guard redirect checks prerequisites, sends back to first incomplete step
   - **Pattern**: `if (!pageModel.field) return h.redirect('/first-step')`

3. **Browser Back Button**: User navigates backward through journey

   - **Handling**: GET handler loads data from session, pre-populates form
   - **Pattern**: `formValues: { field: pageModel.field || '' }`

4. **Validation Errors**: User submits invalid data

   - **Handling**: Re-render form with errors, preserve entered values
   - **Pattern**: POST-Redirect-GET with flash messages OR direct view render with error model

5. **Multiple Concurrent Journeys**: User opens multiple tabs
   - **Pattern A**: Named session key ('pageModel') - shared across tabs
   - **Pattern B**: UUID in URL - separate journey per tab

### Journey Testing Strategy

**Unit Tests** (controllers):

```javascript
// Test controller logic in isolation
describe('Commodity Controller', () => {
  test('POST with valid data redirects to transport', () => {
    const controller = createCommodityController(mockGetSession, mockSetSession)
    const response = controller.post.handler(mockRequest, mockH)
    expect(response).toBe('/import/transport')
  })
})
```

**Integration Tests** (full journey):

```javascript
// Test route registration and auth
describe('Import Journey Plugin', () => {
  test('Should register all import routes', () => {
    const routes = server.table()
    const importRoutes = routes.filter((r) => r.path.startsWith('/import'))
    expect(importRoutes.length).toBe(14) // 7 steps × 2 methods
  })

  test('Should require authentication for all routes', () => {
    importRoutes.forEach((route) => {
      expect(route.settings.auth).toBe('session')
    })
  })
})
```

### Summary: Journey Architecture Decisions

| Aspect                | CDP Pattern                    | Current Implementation                              |
| --------------------- | ------------------------------ | --------------------------------------------------- |
| **Plugin Scope**      | One plugin per journey         | ✅ Correct (`import-journey`)                       |
| **State Storage**     | Redis/Yar session cache        | ✅ Correct (`pageModel` in session)                 |
| **Navigation**        | Controller redirects           | ✅ Correct (`h.redirect()`)                         |
| **File Organization** | Domain-grouped subdirectories  | ✅ Correct (`import/controllers/`, `import/views/`) |
| **Guard Redirects**   | Check prerequisites on GET     | ❓ Consider adding                                  |
| **Step Completion**   | Optional `isComplete` tracking | ❓ Optional enhancement                             |
| **Journey ID**        | Named key or UUID              | ✅ Using named key ('pageModel')                    |

**Recommendation**: Current architecture is correct. Optional enhancements:

1. Add guard redirects to prevent step skipping
2. Consider multistep-form helper for complex branching journeys

## ⚠️ CRITICAL: Plugin Registration Requirements

**When adding a new journey/feature to this application, you MUST modify the correct router file.**

### The ACTUAL Router File (the one that matters):

**`src/plugins/router.js`** ← THIS is the router that gets registered by the server.

This file is imported by `src/plugins/index.js` and registered in `src/server/server.js`.

### Steps to Register a New Plugin:

1. **Create your plugin** in `src/server/<feature>/index.js` with Hapi plugin structure:

   ```javascript
   export const myFeature = {
     plugin: {
       name: 'my-feature',
       register(server) {
         server.route([
           /* routes */
         ])
       }
     }
   }
   ```

2. **Import in `/src/plugins/router.js`**:

   ```javascript
   import { myFeature } from '../server/myfeature/index.js'
   ```

3. **Register in `/src/plugins/router.js`**:
   ```javascript
   export const router = {
     plugin: {
       name: 'router',
       async register(server) {
         // ... existing registrations
         await server.register([myFeature]) // Add your plugin here
       }
     }
   }
   ```

### Common Mistake:

❌ **DO NOT** edit `src/server/router.js` - this file is NOT used and was removed.

✅ **DO** edit `src/plugins/router.js` - this is the ACTUAL router.

### Verification:

After adding your plugin, verify it registered:

```bash
# Test the route returns something other than 404
curl -I http://localhost:3000/your-route

# Should get: 302 (redirect to auth) or 200 (if public route)
# Should NOT get: 404 (means plugin not registered)
```

#### CRITICAL: Plugin Export Structure

**This codebase uses Hapi plugin pattern, NOT simple route arrays.** Routes must be registered via Hapi plugin structure.

**Route Definition** (`src/server/import/index.js`):

```javascript
import { commodityController } from './controllers/commodity.js'
import { transportController } from './controllers/transport.js'
// ... other controllers

export const importJourney = {
  plugin: {
    name: 'import-journey',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/import/commodity',
          handler: commodityController.get.handler,
          options: {
            auth: 'session'
          }
        },
        {
          method: 'POST',
          path: '/import/commodity',
          handler: commodityController.post.handler,
          options: {
            auth: 'session'
          }
        }
        // ... more routes
      ])
    }
  }
}
```

**Critical patterns:**

1. Export object with `plugin` property containing `name` and `register` function
2. `register(server)` calls `server.route([...])` to register routes
3. Handler references: `commodityController.get.handler` (NOT `commodityController.getHandler`)
4. Options must be in `options` object, not at route level

#### Controller Export Structure (Factory Pattern with Dependency Injection)

Controllers use **factory functions** for testability and dependency injection.

**ACTUAL IMPLEMENTATION** (`src/server/import/controllers/commodity.js`):

```javascript
import { buildCommodityViewModel } from '../helpers/view-models.js'
import { commoditySchema } from '../validators/schemas.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import {
  getSessionValue as defaultGetSessionValue,
  setSessionValue as defaultSetSessionValue
} from '../../common/helpers/session-helpers.js'

/**
 * Factory function for commodity controller
 * Enables dependency injection for testing
 *
 * @param {Function} getSessionValue - Function to retrieve session data
 * @param {Function} setSessionValue - Function to store session data
 * @param {Object} validationSchema - Joi schema for validation
 * @returns {Object} Controller with get and post handlers
 */
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
        const { numberOfAnimals, certificationPurpose } = request.payload

        // Validate using Joi schema
        const { error } = validationSchema.validate(
          { numberOfAnimals, certificationPurpose },
          { abortEarly: false }
        )

        if (error) {
          const pageModel = { numberOfAnimals, certificationPurpose }
          const viewModel = buildCommodityViewModel(pageModel, error)
          return h
            .view('import/views/commodity', viewModel)
            .code(statusCodes.badRequest)
        }

        // Update session with new data
        const pageModel = getSessionValue(request, 'pageModel') || {}
        pageModel.numberOfAnimals = parseInt(numberOfAnimals, 10)
        pageModel.certificationPurpose = certificationPurpose
        setSessionValue(request, 'pageModel', pageModel)

        // Navigate to next step
        return h.redirect('/import/transport')
      },
      options: {}
    }
  }
}

// Export default controller instance for production use
export const commodityController = createCommodityController()
```

**Key Patterns**:

1. **Factory function** (`createCommodityController`) enables dependency injection
2. **Default parameters** use actual implementations from `session-helpers.js` and `schemas.js`
3. **Production export** (`commodityController`) calls factory with defaults
4. **Testing** can inject mock functions:
   ```javascript
   const mockGet = vi.fn()
   const mockSet = vi.fn()
   const testController = createCommodityController(mockGet, mockSet)
   ```

**Benefits**:

- Controllers testable in isolation without Hapi server
- Dependencies explicit and injectable
- Validation schemas swappable for testing edge cases
- Session logic abstracted (can mock without touching `request.yar`)

**WRONG patterns (will cause 404):**

```javascript
// ❌ WRONG: Exporting raw functions
export const getCommodity = (request, h) => { ... }
export const postCommodity = (request, h) => { ... }

// ❌ WRONG: Using getHandler/postHandler naming
export const commodityController = {
  getHandler: (request, h) => { ... },
  postHandler: (request, h) => { ... }
}

// ❌ WRONG: Missing nested structure
export const commodityController = {
  handler: (request, h) => { ... }  // No get/post separation
}
```

**Key requirements:**

1. Export named const like `commodityController`
2. Nested structure: `controller.get.handler` and `controller.post.handler`
3. Each method (get/post) must have `handler` function and `options` object
4. View paths must match actual file location (e.g., `import/views/commodity` not `import/commodity`)

#### Testing Plugin Registration

**Test module import directly:**

```bash
node -e "
import('./src/server/import/index.js')
  .then(m => {
    console.log('Module loaded:', Object.keys(m));
    console.log('Plugin name:', m.importJourney?.plugin?.name);
    console.log('Register type:', typeof m.importJourney?.plugin?.register);
  })
  .catch(e => console.error('ERROR:', e.message))
"
```

Expected output:

```
Module loaded: [ 'importJourney' ]
Plugin name: import-journey
Register type: function
```

**Test controller import:**

```bash
node -e "
import('./src/server/import/controllers/commodity.js')
  .then(m => {
    console.log('Controller:', Object.keys(m));
    console.log('Has get.handler:', typeof m.commodityController?.get?.handler);
    console.log('Has post.handler:', typeof m.commodityController?.post?.handler);
  })
  .catch(e => console.error('ERROR:', e.message))
"
```

Expected output:

```
Controller: [ 'commodityController' ]
Has get.handler: function
Has post.handler: function
```

**Common failure modes:**

1. **Plugin not registered in router.js** - Check `src/server/router.js` includes the import
2. **Handler path mismatch** - Must be `controller.get.handler` not `controller.getHandler`
3. **Missing options property** - Spread operator `...controller.get.options` requires options to exist
4. **View path incorrect** - Views in subdirectories need full path (e.g., `import/views/commodity`)
5. **Module export wrong** - Must export object with `plugin` property, not raw routes array

### Session Management with @hapi/yar

**Server Configuration** (`src/server/index.js`):

```javascript
import yar from '@hapi/yar'

await server.register({
  plugin: yar,
  options: {
    storeBlank: false,
    cookieOptions: {
      password: process.env.SESSION_COOKIE_PASSWORD, // 32+ char secret
      isSecure: process.env.NODE_ENV === 'production',
      isHttpOnly: true,
      isSameSite: 'Lax',
      ttl: 1000 * 60 * 60 * 24 // 24 hours
    },
    cache: {
      cache: 'redis_cache',
      expiresIn: 1000 * 60 * 60 * 24,
      segment: 'session'
    }
  }
})
```

**Session Utilities** (`src/server/common/helpers/session.js`):

```javascript
export const getPageModel = (request) => {
  return request.yar.get('pageModel') || {}
}

export const setPageModel = (request, data) => {
  const existing = getPageModel(request)
  request.yar.set('pageModel', { ...existing, ...data })
}

export const clearPageModel = (request) => {
  request.yar.reset()
}
```

### View Model Builders ("Dumb Template" Pattern)

Templates contain zero business logic. Controllers call view builders that prepare all template data.

All view builders located in `src/server/import/helpers/view-models.js`.

**View Builder Structure**:

```javascript
// Example: buildCommodityViewModel
export const buildCommodityViewModel = (pageModel, validationError = null) => {
  // Format errors if validation failed
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

    // Radio/select options with checked/selected state
    certificationOptions: [
      { value: 'Breeding', text: 'Breeding' },
      { value: 'Production', text: 'Production' },
      { value: 'Slaughter', text: 'Slaughter' }
    ],

    // Error structures (if validation failed)
    ...(formattedErrors && {
      errorList: formattedErrors.errorList, // For GOV.UK error summary
      ...formattedErrors.fieldErrors // Field-level errors spread into root
    })
  }
}
```

**Error Formatting** (already documented in Form Validation Pattern section):

```javascript
const formatValidationErrors = (error) => {
  const errorList = error.details.map((err) => ({
    text: err.message,
    href: `#${err.path[0]}`
  }))

  const fieldErrors = {}
  error.details.forEach((err) => {
    const fieldName = err.path[0]
    const errorKey = `${fieldName}Error` // Naming: {fieldName}Error
    fieldErrors[errorKey] = { text: err.message }
  })

  return { errorList, fieldErrors }
}
```

**Date Field Handling** (for GOV.UK date input component):

```javascript
// Split ISO date for template rendering
let day = '',
  month = '',
  year = ''
if (pageModel.arrivalDate) {
  const [y, m, d] = pageModel.arrivalDate.split('-')
  year = y
  month = m // Already zero-padded from combineDateFields
  day = d
}

// Return as dateItems array for GOV.UK date input
dateItems: [
  { name: 'day', value: day },
  { name: 'month', value: month },
  { name: 'year', value: year }
]
```

**Pattern Benefits**:

- Templates are "dumb" - zero logic, only display
- All data transformation in one place
- Error handling consistent across screens
- Radio/checkbox "checked" state calculated once
- Dropdown "selected" state calculated once
- Reference data lookup centralized

**Template** (`src/server/import/views/commodity.njk`):

```nunjucks
{% extends "layouts/page.njk" %}

{% block content %}
  <div class="govuk-grid-row">
    <div class="govuk-grid-column-two-thirds">

      {% if errors %}
        {{ govukErrorSummary({
          titleText: "There is a problem",
          errorList: errors.errorList
        }) }}
      {% endif %}

      <h1 class="govuk-heading-l">{{ heading }}</h1>

      {{ govukInsetText({
        html: "You're importing live <strong>" + commodity.commonName + "</strong> (" + commodity.species + ") from " + commodity.countryOfOrigin + "<br><br>Commodity code: " + commodity.code
      }) }}

      <form method="post" novalidate>

        {{ govukInput({
          id: "numberOfAnimals",
          name: "numberOfAnimals",
          type: "number",
          label: {
            text: "Number of animals"
          },
          hint: {
            text: "For example: 12"
          },
          value: formValues.numberOfAnimals,
          errorMessage: errors.fieldErrors.numberOfAnimals if errors
        }) }}

        {{ govukRadios({
          idPrefix: "certificationPurpose",
          name: "certificationPurpose",
          fieldset: {
            legend: {
              text: "How will the animals be certified?",
              classes: "govuk-fieldset__legend--m"
            }
          },
          items: certificationOptions | map(option => {
            'value': option.value,
            'text': option.text,
            'checked': formValues.certificationPurpose === option.value
          }),
          errorMessage: errors.fieldErrors.certificationPurpose if errors
        }) }}

        {{ govukButton({
          text: "Continue"
        }) }}

      </form>

    </div>
  </div>
{% endblock %}
```

### View Builders for Dropdowns

**Consignor/Consignee Options** (`src/server/import/helpers/format-options.js`):

```javascript
import { config } from '../../../config/index.js'

export const buildConsignorOptions = (selectedId = null) => {
  return [
    { value: '', text: 'Select consignor' },
    ...config.ipaffs.consignors.map((consignor) => ({
      value: consignor.id,
      text: `${consignor.companyName} (${consignor.countryName})`,
      selected: consignor.id === selectedId
    }))
  ]
}

export const buildConsigneeOptions = (selectedId = null) => {
  return [
    { value: '', text: 'Select consignee' },
    ...config.ipaffs.consignees.map((consignee) => ({
      value: consignee.id,
      text: consignee.companyName,
      selected: consignee.id === selectedId
    }))
  ]
}

export const buildBcpOptions = (selectedCode = null) => {
  return [
    { value: '', text: 'Select BCP' },
    ...config.ipaffs.bcps.map((bcp) => ({
      value: bcp.code,
      text: `${bcp.name} - ${bcp.code}`,
      selected: bcp.code === selectedCode
    }))
  ]
}

export const formatAddress = (address) => {
  return [...address.lines, `${address.city}, ${address.postalCode}`]
    .filter(Boolean)
    .join('<br>')
}
```

### Transport Mode Configuration

Transport identifiers are hardcoded in config, selected via radio buttons.

**Config** (`src/config/ipaffs-vnet-data.js`):

```javascript
export const transportModes = [
  {
    mode: 'AIR',
    label: 'Plane',
    identifier: 'BA123',
    displayLabel: 'Plane (Flight BA123)'
  },
  {
    mode: 'SEA',
    label: 'Ship',
    identifier: 'MV OCEANIA',
    displayLabel: 'Ship (Vessel MV OCEANIA)'
  },
  {
    mode: 'RAIL',
    label: 'Train',
    identifier: 'FR9045',
    displayLabel: 'Train (Service FR9045)'
  },
  {
    mode: 'ROAD',
    label: 'Road vehicle',
    identifier: 'GB12ABC',
    displayLabel: 'Road vehicle (Truck GB12ABC)'
  }
]
```

**View Builder**:

```javascript
export const buildTransportViewModel = (pageModel, validationError) => {
  return {
    pageTitle: 'How will the animals arrive?',
    heading: 'How will the animals arrive?',

    formValues: {
      transportMode: pageModel.transportMode || '',
      journeyDurationHours: pageModel.journeyDurationHours || ''
    },

    transportModeOptions: config.ipaffs.transportModes.map((mode) => ({
      value: mode.mode,
      text: mode.displayLabel,
      checked: pageModel.transportMode === mode.mode
    })),

    errors: validationError ? formatValidationErrors(validationError) : null
  }
}
```

### Review Screen Implementation

**Review View Builder** (`src/server/import/helpers/build-review.js`):

```javascript
import { config } from '../../../config/index.js'
import { formatAddress } from './format-options.js'

export const buildReviewViewModel = (pageModel) => {
  // Find selected entities from config
  const consignor = config.ipaffs.consignors.find(
    (c) => c.id === pageModel.consignorId
  )
  const consignee = config.ipaffs.consignees.find(
    (c) => c.id === pageModel.consigneeId
  )
  const bcp = config.ipaffs.bcps.find((b) => b.code === pageModel.bcpCode)
  const transportMode = config.ipaffs.transportModes.find(
    (t) => t.mode === pageModel.transportMode
  )

  return {
    pageTitle: 'Check your answers before submitting',
    heading: 'Check your answers before submitting',

    summaryList: {
      rows: [
        // Animals section
        {
          key: { text: 'Species' },
          value: {
            text: `${config.ipaffs.commodity.speciesName} (${config.ipaffs.commodity.speciesCommonName})`
          },
          actions: { items: [{ href: '/import/commodity', text: 'Change' }] }
        },
        {
          key: { text: 'Number' },
          value: { text: pageModel.numberOfAnimals },
          actions: { items: [{ href: '/import/commodity', text: 'Change' }] }
        },
        {
          key: { text: 'Certified as' },
          value: { text: pageModel.certificationPurpose },
          actions: { items: [{ href: '/import/commodity', text: 'Change' }] }
        },

        // Transport section
        {
          key: { text: 'Transport mode' },
          value: { text: transportMode?.label },
          actions: { items: [{ href: '/import/transport', text: 'Change' }] }
        },
        {
          key: {
            text:
              transportMode?.label === 'Plane'
                ? 'Flight number'
                : 'Vehicle identifier'
          },
          value: { text: transportMode?.identifier },
          actions: { items: [{ href: '/import/transport', text: 'Change' }] }
        },
        {
          key: { text: 'Journey duration' },
          value: { text: `${pageModel.journeyDurationHours} hours` },
          actions: { items: [{ href: '/import/transport', text: 'Change' }] }
        },

        // Arrival section
        {
          key: { text: 'Border control post' },
          value: { html: `${bcp?.name}<br>${pageModel.bcpCode}` },
          actions: { items: [{ href: '/import/arrival', text: 'Change' }] }
        },
        {
          key: { text: 'Arrival date' },
          value: { text: formatDate(pageModel.arrivalDate) },
          actions: { items: [{ href: '/import/arrival', text: 'Change' }] }
        },
        {
          key: { text: 'Arrival time' },
          value: { text: pageModel.arrivalTime },
          actions: { items: [{ href: '/import/arrival', text: 'Change' }] }
        },

        // Origin section
        {
          key: { text: 'Consignor' },
          value: {
            html: `${consignor?.companyName}<br>${consignor?.countryName}`
          },
          actions: { items: [{ href: '/import/origin', text: 'Change' }] }
        },

        // Destination section
        {
          key: { text: 'Consignee' },
          value: {
            html: `${consignee?.companyName}<br>${consignee?.countryName}`
          },
          actions: { items: [{ href: '/import/destination', text: 'Change' }] }
        },
        {
          key: { text: 'CPH number' },
          value: { text: pageModel.cphNumber },
          actions: { items: [{ href: '/import/destination', text: 'Change' }] }
        }
      ]
    }
  }
}

const formatDate = (isoDate) => {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}
```

### Confirmation Screen

Displays the collected page model as JSON (no backend transformation in this prototype).

**Controller** (`src/server/import/controllers/confirmation.js`):

```javascript
import { getPageModel } from '../../common/helpers/session.js'

export const confirmationController = {
  getHandler: async (request, h) => {
    const pageModel = getPageModel(request)
    const chedReference =
      request.params.chedReference || 'DRAFT.GB.2025.1207486'

    return h.view('import/confirmation', {
      pageTitle: 'Import notification submitted',
      chedReference,
      pageModelJson: JSON.stringify(pageModel, null, 2)
    })
  }
}
```

**Template** (`src/server/import/views/confirmation.njk`):

```nunjucks
{% extends "layouts/page.njk" %}

{% block content %}
  {{ govukPanel({
    titleText: "Import notification submitted",
    html: "Your CHED reference:<br><strong>" + chedReference + "</strong>"
  }) }}

  <h2 class="govuk-heading-m">What happens next</h2>
  <p class="govuk-body">Your notification has been sent to the Border Control Post.</p>

  <h2 class="govuk-heading-m">Collected data (Page Model)</h2>
  <pre class="govuk-body-s" style="background: #f3f2f1; padding: 20px; overflow-x: auto;">
    <code>{{ pageModelJson }}</code>
  </pre>

  <p class="govuk-body">
    <a href="/import/commodity" class="govuk-link">Submit another notification</a>
  </p>
{% endblock %}
```

### Validation Strategies

This application uses **Joi schema validation** exclusively. All validation schemas are centralized in `src/server/import/validators/schemas.js`.

**Implementation Approach**:

- Each screen has a dedicated Joi schema (commoditySchema, transportSchema, arrivalSchema, partiesSchema, reviewSchema)
- Schemas are documented in their respective screen sections above (see Validation subsections in Screens 1-5)
- Controllers inject schema as dependency (factory pattern enables testing with mock schemas)
- Error messages are GOV.UK Design System compliant

**Schema Location**:

```
src/server/import/validators/schemas.js
├── commoditySchema    (Screen 1: Commodity - see line 127)
├── transportSchema    (Screen 2: Transport - see line 213)
├── arrivalSchema      (Screen 3: Arrival - see line 297)
├── partiesSchema      (Screen 4: Parties - see line 421)
└── reviewSchema       (Screen 5: Review - see line 535)
```

**Validation Pattern in Controllers**:

```javascript
post: {
  handler(request, h) {
    const { error } = validationSchema.validate(
      request.payload,
      { abortEarly: false }  // Collect ALL errors, not just first
    )

    if (error) {
      const pageModel = getSessionValue(request, 'pageModel') || {}
      const viewModel = buildViewModel(pageModel, error)
      return h.view('import/views/screen', viewModel).code(400)
    }

    // Valid data: merge into pageModel and proceed
    const pageModel = getSessionValue(request, 'pageModel') || {}
    const updatedPageModel = { ...pageModel, ...request.payload }
    setSessionValue(request, 'pageModel', updatedPageModel)

    return h.redirect('/import/next-screen')
  }
}
```

**Error Handling Flow**:

1. Controller validates payload with Joi schema (`{ abortEarly: false }` to collect all errors)
2. If validation fails, pass `error` object to view model builder
3. View model builder calls `formatValidationErrors(error)` (see Form Validation Pattern section)
4. Template receives `errorList` (for error summary) and field-level errors (e.g., `numberOfAnimalsError`)
5. GOV.UK components render error summary and inline field errors

## CDP-Standard File Structure

Following CDP conventions from `cdp-node-frontend-template`:

```
src/
├── index.js                         # Application entry point
├── server/
│   ├── index.js                     # Server setup, plugin registration
│   ├── router.js                    # Central route registration
│   ├── health/
│   │   └── index.js                 # Health check endpoint
│   ├── common/
│   │   ├── helpers/
│   │   │   ├── session.js           # Session get/set/clear utilities
│   │   │   └── view-builders.js     # Common view preparation functions
│   │   └── templates/
│   │       └── layouts/
│   │           └── page.njk         # GOV.UK Design System base layout
│   └── import/                      # Feature module (journey)
│       ├── index.js                 # Route definitions for all 7 screens
│       ├── controllers/
│       │   ├── commodity.js         # Screen 1: GET/POST handlers
│       │   ├── transport.js         # Screen 2: GET/POST handlers
│       │   ├── arrival.js           # Screen 3: GET/POST handlers
│       │   ├── origin.js            # Screen 4: GET/POST handlers
│       │   ├── destination.js       # Screen 5: GET/POST handlers
│       │   ├── review.js            # Screen 6: GET handler
│       │   ├── submit.js            # POST /import/submit handler
│       │   └── confirmation.js      # Screen 7: GET handler
│       ├── helpers/
│       │   ├── build-review.js      # Build summary list for review screen
│       │   ├── format-options.js    # Build dropdown options
│       │   └── view-models.js       # View builders for each screen
│       └── views/
│           ├── commodity.njk        # Screen 1 template
│           ├── transport.njk        # Screen 2 template
│           ├── arrival.njk          # Screen 3 template
│           ├── origin.njk           # Screen 4 template
│           ├── destination.njk      # Screen 5 template
│           ├── review.njk           # Screen 6 template
│           └── confirmation.njk     # Screen 7 template
├── config/
│   ├── index.js                     # Environment config loader
│   └── ipaffs-vnet-data.js          # Hardcoded IPAFFS vNet test data
├── validators/
│   └── journey-schemas.js           # Joi validation schemas for all screens
└── assets/
    ├── css/
    ├── js/
    └── images/
```
