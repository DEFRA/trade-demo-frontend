# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

Node.js/Hapi.js frontend demonstrating CDP platform integration with a Java Spring Boot backend.
Implements DEFRA ID OIDC authentication, Redis session management, GOV.UK Design System forms, and
direct service-to-service communication with backend.

## Development Commands

### Setup and Running

```bash
make start              # Start MongoDB backend stack + frontend with hot reload
make restart            # Restart the frontend
make debug              # Start in debug mode (debugger on port 9229)
make stop               # Stop all services
make register-user      # Register test user with local DEFRA ID stub (required before first login)
```

Access at http://localhost:3000

### Testing

```bash
npm test                # Run unit tests only
npm run test:watch      # Watch mode
make test-integration   # Run all tests including integration
npm run lint            # Lint JS and SCSS
npm run format          # Auto-fix formatting
```

### Other

```bash
make logs               # Show Docker logs
make ps                 # Show service status
./scripts/inspect-redis-sessions.sh  # Decode and inspect Redis sessions
```

## Architecture

### Two-Layer Architecture

**Infrastructure Layer** (`src/plugins/`):

- `auth.js` - Bell (OAuth2/OIDC) and Cookie authentication strategies
- `session.js` - Yar session management with Redis backend
- `csrf.js` - CSRF protection via @hapi/crumb
- `router.js` - Aggregates and registers all feature plugins

**Application Layer** (`src/server/`):

- `import/` - Import journey plugin (multi-page form flow)
- `dashboard/` - Dashboard plugin
- `auth/` - Login/logout routes
- `health/` - Health check endpoint
- `common/` - Shared utilities and helpers

### Plugin Pattern

All features are Hapi plugins following this structure:

```javascript
export const pluginName = {
  plugin: {
    name: 'plugin-name',
    register(server) {
      // Route registration or plugin configuration
    }
  }
}
```

Multi-page journeys are implemented as **one plugin per journey** (not one per page). See
`src/server/import/index.js` for the import journey plugin that registers all journey routes.

### Controller Factory Pattern

Controllers use factory functions for testability:

```javascript
export const createController = (getSessionValue = defaultGetSessionValue) => {
  return {
    get: {
      handler(request, h) {
        /* ... */
      }
    },
    post: {
      handler(request, h) {
        /* ... */
      }
    }
  }
}

export const controller = createController()
```

Tests inject mocks: `createController(mockGet, mockSet)`. Production uses real implementations.

## Session Management

### Configuration

- **Storage**: Redis (production), memory (test)
- **Plugin**: @hapi/yar
- **TTL**: 4 hours (sliding window)
- **Cookie**: SameSite='Lax' (CRITICAL for CDP OIDC compatibility)
- **Redis keys**: `trade-demo-frontend:!@hapi/yar:{uuid}`

### Session Helpers

Located in `src/server/common/helpers/session-helpers.js`:

- `getSessionValue(request, key)` - retrieve value
- `setSessionValue(request, key, value)` - store value
- `clearSessionValue(request, key)` - remove key
- `resetSession(request)` - clear entire session

### PageModel Pattern

Session stores **flat pageModel** structure (not nested). Controllers accumulate data:

```javascript
// Get existing pageModel
const pageModel = getSessionValue(request, 'pageModel') || {}

// Add/update fields
pageModel.transportMode = transportMode

// Save back to session
setSessionValue(request, 'pageModel', pageModel)
```

## Form Patterns

### Validation

Joi schemas in `src/server/import/validators/schemas.js`:

```javascript
const schema = Joi.object({
  numberOfAnimals: Joi.number().integer().min(1).required().messages({
    'number.base': 'Enter the number of animals',
    'any.required': 'Enter the number of animals'
  })
})
```

### Error Handling

Joi errors transformed by `formatValidationErrors()` in `src/server/import/helpers/view-models.js`
into:

1. **Error summary**: `errorList` array for GOV.UK error summary component
2. **Field errors**: `{fieldName}Error` objects for inline display

```javascript
{
  errorList: [{ text: 'Enter the number of animals', href: '#numberOfAnimals' }],
    fieldErrors
:
  { numberOfAnimalsError: { text: 'Enter the number of animals' } }
}
```

### CSRF Protection

**CRITICAL**: All POST forms MUST include CSRF token named `crumb` (NOT `csrfToken`):

```nunjucks
<form method="post" novalidate>
  <input type="hidden" name="crumb" value="{{ crumb }}" />
  <!-- form fields -->
</form>
```

### View Model Builders

All view builders in `src/server/import/helpers/view-models.js`. Controllers call builders to
prepare template data - **templates contain zero business logic**.

## Client-Side JavaScript Patterns

### Autocomplete Pattern

Located in `src/client/javascripts/` (e.g., `bcp-autocomplete.js`, `species-autocomplete.js`).

**Key patterns**:

```javascript
// Minimum query length check (3+ characters)
if (query.length < 3) {
  suggestions.innerHTML = ''
  return
}

// Fetch suggestions from API
fetch(`/api/endpoint?filter=${encodeURIComponent(query)}`)
  .then((res) => res.json())
  .then((data) => {
    suggestions.innerHTML = ''
    data.forEach((item) => {
      const div = document.createElement('div')
      div.className = 'suggestion'
      div.textContent = item
      div.onclick = () => {
        input.value = item
        // Optional: auto-submit form or just fill input
        // form.submit()
      }
      suggestions.appendChild(div)
    })
  })
```

**Important notes**:

- Use `< 3` for minimum length, NOT `> 3` (which would clear results when typing more)
- Always `encodeURIComponent()` the query parameter
- Close suggestions on outside click for better UX
- Support keyboard navigation (arrow keys, Enter) for accessibility

## Commodity Selection Flow

The commodity selection journey is a multi-step flow with complex navigation and session management.

### Flow Steps

1. **Commodity Search** (`/import/commodity/codes`)

- Search by commodity code or species name
- Browse hierarchical commodity tree
- Two tabs: "Commodity search" and "Species search"

2. **Species Selection** (`/import/commodity/codes/species`)

- Shows after searching for a commodity code
- User selects species via checkboxes
- Can select commodity type (if applicable)

3. **Quantities Entry** (`/import/commodity/codes/quantities`)

- Shows table of selected species
- User enters number of animals and packages per species
- Displays running totals

### Key Routes

```javascript
// Main search page - always shows full tree
GET /
import

/commodity/
codes
  → commoditySearchController.showSearchPage

// Commodity code search - shows species selection
GET /
import

/commodity/
codes / search ? commodity - code = X
  → commoditySearchController.search
  → Returns: select.njk
with species checkboxes

// Species autocomplete API
GET /
import

/commodity/
codes / species - autofill ? filter = X
  → commoditySearchController.speciesSearch
  → Returns: JSON
array
of
species
names

// Species search - filters tree by species
GET /
import

/commodity/s
pecies / search ? species - text - input = X
  → commoditySearchController.speciesSearchTree
  → Returns: index.njk
with filtered tree

// Back to commodity search (clears selection)
GET /
import

/commodity/
codes / species / back
  → commoditySelectionController.backToCommoditySearch
  → Clears: commodity - selected - species, commodity - code -
details, etc.// Show species selection (for back navigation)
  GET /
import

/commodity/
codes / species
  → commoditySelectionController.showSpeciesSelection
  → Loads
from
session, clears
commodity - selected - species

// Save selected species
GET /
import

/commodity/
codes / select ? species = X & species = Y
  → commoditySelectionController.saveSelectedSpecies
  → Saves
to
session, redirects
to
quantities

// Show quantities form
GET /
import

/commodity/
codes / quantities
  → commodityQuantitiesController.showQuantitiesForm
  → Guard: redirects
if no species
selected

// Save quantities
GET /
import

/commodity/
codes / quantities / save
  → commodityQuantitiesController.saveQuantities
  → Saves
quantities, redirects
to
next
journey
step
```

### Session Keys Used

- `commodity-code` - The selected commodity code
- `commodity-code-details` - Full commodity details from API
- `commodity-code-species` - Available species for the commodity
- `commodity-selected-species` - User's selected species (with quantities)
- `commodity-type` - Selected commodity type
- `commodity-code-tree` - Cached tree data (flattened)
- `commodity-code-description` - Description for display

### Back Navigation Pattern

**Critical**: Back navigation must clear session data to prevent redirect loops.

```javascript
// When going back from quantities to species selection
// Just clear the selected species (keeps search results)
clearSessionValue(request, 'commodity-selected-species')

// When going back from species selection to commodity search
// Clear ALL commodity-related session data
clearSessionValue(request, 'commodity-selected-species')
clearSessionValue(request, 'commodity-code-details')
clearSessionValue(request, 'commodity-code-species')
clearSessionValue(request, 'commodity-code')
clearSessionValue(request, 'commodity-code-description')
```

**Why this is needed**: The main search page checks for `commodity-selected-species` in session and
redirects to quantities if found. Without clearing, users get stuck in a redirect loop.

### Conditional Back Links

Templates use the `action` variable to determine back link targets:

```nunjucks
{{ govukBackLink({
  text: "Back",
  href: "/import/commodity/codes/species" if action === 'edit' else "/import/commodity/codes/species/back"
}) }}
```

- `action === 'edit'` → Quantities page → Back to species selection
- `action !== 'edit'` → Species selection → Back to commodity search (with clearing)

### Tree Navigation

The commodity tree supports hierarchical navigation up to 4 levels deep:

```javascript
// First level
GET /
import

/commodity/
codes / { parentCode }
/first

// Second level
GET /
import

/commodity/
codes / { parentCode }
/{childCode}/s
econd

// Third/leaf level
GET /
import

/commodity/
codes / { parentCode }
/{firstChild}/
{secondChild}
/third
GET /
import

/commodity/
codes / { parentCode }
/{firstChild}/
{secondChild}
/{leafCode}/
third
```

Tree data is stored flattened in session using the `flat` library for efficient storage.

### Reloading Tree on Main Page

**Important**: The main search page always fetches a fresh, unfiltered tree (ignoring cached
filtered trees from species search):

```javascript
// Always fetch full tree, don't use cached filtered tree
const treeParent = await getCommodityCodesTreeData(
  CERT_TYPE,
  '',
  traceId,
  request
)
```

This ensures users always see the complete tree when returning to the main page.

## Backend Integration

### API Client Pattern

Located in `src/server/common/helpers/api-client.js` and
`src/server/import/integration/commodity-code-api-client.js`:

```javascript
export const exampleApi = {
  async findAll(traceId) {
    const response = await fetch(`${baseUrl}/example`, {
      method: 'GET',
      headers: {
        [tracingHeader]: traceId // x-cdp-request-id
      }
    })

    if (!response.ok) {
      throw createError(response)
    }

    return response.json()
  }
}
```

**Key patterns**:

- Propagate `x-cdp-request-id` on all requests
- Use node-fetch v3 with async/await
- Check `response.ok` before parsing JSON
- Backend URL from `config.get('backendApi.baseUrl')`

### Query Parameter Encoding

**CRITICAL**: Encode query parameters correctly, NOT entire objects:

```javascript
// WRONG - encodes entire object as string
const params = encodeURIComponent({ species })
const url = `${baseUrl}?${params}` // Results in: ?%5Bobject%20Object%5D

// CORRECT - build query string properly
const params = `species=${encodeURIComponent(species)}`
const url = `${baseUrl}?${params}` // Results in: ?species=Bos%20taurus
```

For multiple parameters, use template literals or URL construction:

```javascript
const params = `param1=${encodeURIComponent(val1)}&param2=${encodeURIComponent(val2)}`
```

### Notification Submission Patterns

The application uses distinct endpoints for draft and final submission, allowing the backend to infer notification status from the endpoint called.

**Key concepts**:

- `buildNotificationDto(sessionData)` - Builds NotificationDto from session data WITHOUT status field
- `notificationApi.saveDraft()` - Calls PUT /notifications for draft saving
- `notificationApi.submitNotification()` - Calls POST /notifications/submit for final submission
- Backend infers status: PUT = DRAFT, POST /notifications/submit = SUBMITTED

**Draft saving pattern**:

```javascript
// Build DTO without status parameter
const notificationDto = buildNotificationDto(sessionData)

// Backend infers DRAFT status from PUT endpoint
const savedNotification = await notificationApi.saveDraft(
  notificationDto,
  traceId
)
```

**Final submission pattern**:

```javascript
// Build DTO without status parameter
const notificationDto = buildNotificationDto(sessionData)

// Backend infers SUBMITTED status from POST /notifications/submit endpoint
const submittedNotification = await notificationApi.submitNotification(
  notificationDto,
  traceId
)
```

**CRITICAL**: Never include `status` field in NotificationDto. The backend determines status based on which endpoint is called:

- PUT /notifications → status = DRAFT
- POST /notifications/submit → status = SUBMITTED

## Authentication

DEFRA ID OIDC authentication via @hapi/bell. Session cookie uses `isSameSite: 'Lax'` (CRITICAL for
OAuth redirect callback).

Bell OAuth state cookie uses `isSecure: false` (required for local HTTP, works in CDP HTTPS) and
`isSameSite: 'Strict'`.

See `docs/oauth-oidc.md` for detailed authentication flow.

## Configuration

Convict-based config in `src/config/config.js`. Environment-based decisions centralized:

- `isLocal` vs `isPlatform` - determines security settings
- `isTest` - disables CSRF, uses memory session
- All config via environment variables or sensible defaults

## Testing

- **Unit tests**: Vitest with coverage via v8
- **Integration tests**: `./scripts/run-integration-tests.sh` starts DEFRA ID stub
- **Controller testing**: Use factory pattern to inject mocks
- **Session testing**: Use memory cache engine in tests

## CDP Platform Patterns

- **Trace ID propagation**: `x-cdp-request-id` header on all requests
- **ECS logging**: Structured JSON logs in platform (pino-pretty locally)
- **Redis sessions**: TLS in platform, single instance locally
- **Secure contexts**: Enabled in platform only
- **Metrics**: CloudWatch metrics via aws-embedded-metrics (platform only)

## Key Files

### Core Infrastructure

- `src/plugins/index.js` - Central plugin registration
- `src/server/server.js` - Server factory
- `src/config/config.js` - Configuration loader
- `src/server/common/helpers/session-helpers.js` - Session utilities
- `src/server/common/helpers/api-client.js` - Backend API client (notification submission)

### Import Journey

- `src/server/import/index.js` - Route registration for import journey
- `src/server/import/controllers/commodity-search.js` - Commodity search, tree navigation, species
  search
- `src/server/import/controllers/commodity-selection.js` - Species selection and back navigation
- `src/server/import/controllers/commodity-quantities.js` - Quantities entry
- `src/server/import/controllers/review.js` - Review and final submission controller
- `src/server/import/controllers/save-as-draft.js` - Draft saving controller
- `src/server/import/helpers/notification-builder.js` - Builds NotificationDto from session data
- `src/server/import/helpers/view-models.js` - View builders
- `src/server/import/integration/commodity-code-api-client.js` - Commodity API client

### Client-Side

- `src/client/javascripts/species-autocomplete.js` - Species autocomplete
- `src/client/javascripts/bcp-autocomplete.js` - BCP autocomplete
- `src/client/stylesheets/components/_autocomplete.scss` - Autocomplete styles

### Templates

- `src/server/import/templates/commodity-codes/index.njk` - Main commodity search page
- `src/server/import/templates/commodity-codes/select.njk` - Species selection and quantities
- `src/server/import/templates/commodity-codes/commodityTree.njk` - Tree component
- `src/server/common/templates/layouts/page.njk` - Base layout

### Documentation

- `docs/architecture.md` - Detailed architecture documentation
- `CLAUDE.md` - This file

## GOV.UK Design System

Uses govuk-frontend 5.11.0. Templates in Nunjucks. Components use standard GOV.UK patterns for
forms, error messages, and page layouts.

Base layout: `src/server/common/templates/layouts/page.njk`

## Common Pitfalls and Solutions

### Commodity Flow

1. **Redirect Loops**: If users get stuck in redirect loops between pages, check session clearing in
   back navigation handlers. The main search page redirects to quantities if
   `commodity-selected-species` exists in session.

2. **Filtered Tree Persists**: The main search page should always fetch the full tree. Don't rely on
   cached `commodity-code-tree` from session as it may contain filtered results from species search.

3. **Query Parameter Encoding**: Never `encodeURIComponent()` an entire object. Build query strings
   properly: `species=${encodeURIComponent(value)}`.

4. **Autocomplete Min Length**: Use `if (query.length < 3)` NOT `if (query.length > 3)`. The latter
   clears results when users type MORE characters.

5. **Back Links**: Use conditional back links based on `action` variable. Quantities page needs
   different back behavior than species selection page.

### Session Management

1. **Flattened Storage**: Commodity tree is stored flattened using `flat` library. Always unflatten
   before use: `unflatten(getSessionValue(request, 'commodity-code-tree'))`.

2. **Clearing vs Resetting**: Use `clearSessionValue()` for specific keys, `resetSession()` only
   when logging out or starting completely fresh journey.

3. **Session Keys**: Be consistent with naming. Commodity flow uses kebab-case keys:
   `commodity-code`, `commodity-selected-species`.

### Forms

1. **CSRF Token Name**: Always use `crumb`, never `csrfToken`. This is configured in the CSRF
   plugin.

2. **GET vs POST**: The commodity flow uses GET for most operations (to support back button). Use
   POST only for data mutation (saving drafts, final submission).

3. **Validation Errors**: Always return appropriate status codes (`400`) with validation errors for
   accessibility and SEO.
