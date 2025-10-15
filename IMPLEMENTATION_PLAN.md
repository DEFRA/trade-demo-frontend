# CDP Node.js Frontend - Trade Demo Frontend Implementation Plan

**Status:** ⬜ Ready to Begin
**Target Framework:** Node.js 22+ with Hapi.js, Nunjucks, GDS Design System
**Backend Integration:** Java Spring Boot (trade-demo-backend)
**Session Management:** @hapi/yar with Redis (server-side)
**Last Updated:** 2025-10-03

---

## Executive Summary

This document tracks the implementation of a **GDS-compliant multi-step journey** that demonstrates CDP platform integration with the Java `trade-demo-backend` service. The frontend follows standard GDS patterns for multi-page forms, check answers flows, and accessible user interfaces.

### Quick Status

- ⬜ Project setup from template
- ⬜ Session helpers for multi-step forms
- ⬜ Backend API client with trace ID
- ⬜ 9-page GDS journey implementation
- ⬜ Error handling and validation
- ⬜ Testing and documentation

---

## Implementation Philosophy & Principles

> **⚠️ IMPORTANT FOR ALL DEVELOPERS & LLMs**: These principles guide ALL implementation decisions.

### 🎯 Core Principles

#### 1. GDS Design System First

- **Use GOV.UK Design System patterns** for everything
- **Multi-step form pattern** for complex data collection
- **Check your answers pattern** before submission
- **Start page pattern** for service introduction
- **Confirmation pattern** for success messages

#### 2. Server-Side Session State

- **All form data in Redis session** (via @hapi/yar)
- **Encrypted cookies only** (no session data in browser)
- **4-hour timeout** for user journeys
- **Clear session** after successful submission

#### 3. CDP Platform Integration

- **Direct backend calls** (no API Gateway for internal services)
- **Propagate x-cdp-request-id** to all backend calls
- **Redis auto-provisioned** by CDP (frontends only)
- **ECS logging** with trace correlation

#### 4. YAGNI (You Aren't Gonna Need It)

- **No client-side frameworks** (React, Vue, etc.)
- **No new dependencies** (use template's tools)
- **Client-side search** (simple, no backend changes)
- **Standard Hapi.js patterns** throughout

---

## User Journey Overview

### **Complete Flow (9 Pages)**

```
1. /                              GDS Start page
2. /examples                      Search & list examples
3. /example/create/name           Multi-step form: Step 1 (Name)
4. /example/create/value          Multi-step form: Step 2 (Value)
5. /example/create/counter        Multi-step form: Step 3 (Counter - optional)
6. /example/create/check          Check your answers
7. /example/{id}/edit             Edit existing example
8. /confirmation                  Success confirmation
9. /example/{id}                  View single example (optional)
```

### **Primary User Flows**

**Flow A: Create New Example**

```
/ → [Start now]
  → /examples → [Create new example]
    → /example/create/name → [Enter name] → [Continue]
      → /example/create/value → [Enter value] → [Continue]
        → /example/create/counter → [Enter counter OR Skip] → [Continue]
          → /example/create/check → [Confirm] → [Create example]
            → Backend: POST /example
            → /confirmation?action=created
```

**Flow B: Edit Existing**

```
/examples → [Edit]
  → /example/{id}/edit → [Change values] → [Save]
    → Backend: PUT /example/{id}
    → /confirmation?action=updated
```

**Flow C: Search & Delete**

```
/examples → [Search term] → [Search]
  → Filtered table
    → [Delete] → Backend: DELETE /example/{id}
    → /confirmation?action=deleted
```

---

## Session Management Strategy

### **How State is Preserved**

**Technology:** @hapi/yar (session plugin for Hapi.js)

**Storage:**

- **Local:** In-memory (Catbox Memory)
- **CDP:** Redis (auto-provisioned by platform)

**Session Structure:**

```javascript
request.yar._store = {
  'example.name': 'Test Example', // Step 1
  'example.value': 'Test Value', // Step 2
  'example.counter': 42, // Step 3 (optional)
  searchQuery: 'search term', // For search results
  returnUrl: '/examples' // For cancel/back
}
```

**Lifecycle:**

```
Step 1 POST → Store name in session → Redirect to Step 2
Step 2 GET  → Read name from session → Display form
Step 2 POST → Add value to session  → Redirect to Step 3
Step 3 GET  → Read name+value        → Display form
Step 3 POST → Add counter to session → Redirect to Check
Check GET   → Read all from session  → Display summary
Check POST  → Submit to backend      → Clear session → Redirect
```

**Key Points:**

- ✅ Session stored in Redis (not browser)
- ✅ Only encrypted cookie sent to browser
- ✅ Back/Change links work automatically
- ✅ 4-hour timeout (configurable)
- ✅ Survives frontend restarts

---

## Detailed Page Specifications

### **Page 1: Start (/)**

**Purpose:** GDS start page pattern
**Backend API:** None
**Session:** None
**Method:** GET only

**GDS Components:**

- Standard start page layout
- `govukButton` - "Start now"

**View Template:**

```njk
{% extends 'layouts/page.njk' %}

{% block content %}
  <div class="govuk-grid-row">
    <div class="govuk-grid-column-two-thirds">
      <h1 class="govuk-heading-xl">Manage Examples</h1>

      <p class="govuk-body">
        Use this service to create, view, edit, and delete examples
        in the trade demo backend system.
      </p>

      <p class="govuk-body">
        This service demonstrates CDP platform integration with a
        Java Spring Boot backend.
      </p>

      <h2 class="govuk-heading-m">Before you start</h2>

      <p class="govuk-body">You can:</p>
      <ul class="govuk-list govuk-list--bullet">
        <li>view all existing examples</li>
        <li>create new examples with name, value, and counter</li>
        <li>edit existing examples</li>
        <li>delete examples</li>
      </ul>

      {{ govukButton({
        text: "Start now",
        href: "/examples",
        isStartButton: true
      }) }}
    </div>
  </div>
{% endblock %}
```

**Controller:**

```javascript
// src/server/start/controller.js
export const startController = {
  handler(request, h) {
    return h.view('start/index', {
      pageTitle: 'Manage Examples',
      heading: 'Manage Examples'
    })
  }
}
```

---

### **Page 2: Examples List (/examples)**

**Purpose:** Search and display all examples
**Backend API:** `GET /example` (fetch all)
**Session:** Store search query
**Method:** GET

**GDS Components:**

- `govukInput` - Search box
- `govukButton` - Search, Create new
- `govukTable` - Results table
- `govukInsetText` - No results message

**Features:**

- Client-side search (filter results by name)
- Table columns: Name, Value, Counter, Actions
- Actions per row: View, Edit, Delete
- "Create new example" button

**Controller Logic:**

```javascript
// src/server/examples/controller.js
import { exampleApi } from '../common/helpers/api-client.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'

export const examplesController = {
  list: {
    async handler(request, h) {
      const traceId = request.headers['x-cdp-request-id']
      const searchQuery = request.query.search || ''

      // Fetch all examples from backend
      const allExamples = await exampleApi.findAll(traceId)

      // Client-side filter
      const examples = searchQuery
        ? allExamples.filter((e) =>
            e.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : allExamples

      // Store search for session
      if (searchQuery) {
        setSessionValue(request, 'searchQuery', searchQuery)
      }

      return h.view('examples/list', {
        pageTitle: 'All Examples',
        examples,
        searchQuery,
        hasResults: examples.length > 0,
        totalCount: allExamples.length
      })
    }
  }
}
```

**View Template:**

```njk
{% extends 'layouts/page.njk' %}

{% block content %}
  <h1 class="govuk-heading-xl">All Examples</h1>

  {# Search Form #}
  <form method="GET" action="/examples">
    <div class="govuk-grid-row">
      <div class="govuk-grid-column-two-thirds">
        {{ govukInput({
          label: { text: "Search by name" },
          id: "search",
          name: "search",
          value: searchQuery,
          classes: "govuk-!-width-two-thirds"
        }) }}
      </div>
    </div>

    <div class="govuk-button-group">
      {{ govukButton({ text: "Search" }) }}
      {% if searchQuery %}
        <a href="/examples" class="govuk-link">Clear search</a>
      {% endif %}
    </div>
  </form>

  {# Create Button #}
  <div class="govuk-!-margin-top-6">
    {{ govukButton({
      text: "Create new example",
      href: "/example/create/name"
    }) }}
  </div>

  {# Results Table #}
  {% if hasResults %}
    <p class="govuk-body">
      Showing {{ examples.length }}
      {% if searchQuery %}of {{ totalCount }}{% endif %}
      example{{ 's' if examples.length != 1 }}
    </p>

    {{ govukTable({
      head: [
        { text: "Name" },
        { text: "Value" },
        { text: "Counter" },
        { text: "Actions" }
      ],
      rows: examples | map(function(example) {
        return [
          { text: example.name },
          { text: example.value },
          { text: example.counter or '—' },
          { html: '<a href="/example/' + example.id + '">View</a> |
                   <a href="/example/' + example.id + '/edit">Edit</a> |
                   <a href="/example/' + example.id + '/delete">Delete</a>' }
        ]
      })
    }) }}
  {% else %}
    {{ govukInsetText({
      text: "No examples found" + (" matching '" + searchQuery + "'" if searchQuery else "")
    }) }}
  {% endif %}
{% endblock %}
```

---

### **Page 3: Create Step 1 - Name (/example/create/name)**

**Purpose:** First step of multi-step form
**Backend API:** None (session only)
**Session:** Store name
**Method:** GET (display), POST (submit)

**GDS Components:**

- `govukInput` - Name field
- `govukButton` - Continue
- `govukErrorSummary` - Validation errors

**Controller:**

```javascript
// src/server/examples/create-name/controller.js
import {
  setSessionValue,
  getSessionValue
} from '../../common/helpers/session-helpers.js'

export const createNameController = {
  get: {
    handler(request, h) {
      // Pre-fill if user navigated back
      const existingName = getSessionValue(request, 'example.name')

      return h.view('examples/create-name', {
        pageTitle: 'What is the name of the example?',
        name: existingName
      })
    }
  },

  post: {
    handler(request, h) {
      const { name } = request.payload

      // Validate
      const errors = []
      if (!name || name.trim().length === 0) {
        errors.push({
          text: 'Enter the name',
          href: '#name'
        })
      } else if (name.length > 100) {
        errors.push({
          text: 'Name must be 100 characters or less',
          href: '#name'
        })
      }

      if (errors.length > 0) {
        return h.view('examples/create-name', {
          pageTitle: 'What is the name of the example?',
          errorList: errors,
          name
        })
      }

      // Store in session
      setSessionValue(request, 'example.name', name.trim())

      // Redirect to next step
      return h.redirect('/example/create/value')
    }
  }
}
```

**View Template:**

```njk
{% extends 'layouts/page.njk' %}

{% block content %}
  {% if errorList %}
    {{ govukErrorSummary({
      titleText: "There is a problem",
      errorList: errorList
    }) }}
  {% endif %}

  <div class="govuk-grid-row">
    <div class="govuk-grid-column-two-thirds">
      <form method="POST" action="/example/create/name">
        {{ govukInput({
          label: {
            text: "What is the name of the example?",
            classes: "govuk-label--l",
            isPageHeading: true
          },
          hint: {
            text: "The name must be unique"
          },
          id: "name",
          name: "name",
          value: name,
          errorMessage: errorList[0] if errorList,
          classes: "govuk-!-width-two-thirds"
        }) }}

        {{ govukButton({ text: "Continue" }) }}
      </form>
    </div>
  </div>
{% endblock %}
```

---

### **Page 4: Create Step 2 - Value (/example/create/value)**

**Purpose:** Second step of multi-step form
**Backend API:** None (session only)
**Session:** Store value
**Method:** GET (display), POST (submit)

**GDS Components:**

- `govukTextarea` - Value field (multi-line)
- `govukButton` - Continue
- `govukBackLink` - Back to previous step

**Controller:**

```javascript
// src/server/examples/create-value/controller.js
import {
  setSessionValue,
  getSessionValue
} from '../../common/helpers/session-helpers.js'

export const createValueController = {
  get: {
    handler(request, h) {
      const name = getSessionValue(request, 'example.name')
      const existingValue = getSessionValue(request, 'example.value')

      // Guard: Redirect if step 1 incomplete
      if (!name) {
        return h.redirect('/example/create/name')
      }

      return h.view('examples/create-value', {
        pageTitle: 'What is the value?',
        backLink: '/example/create/name',
        name, // For context display
        value: existingValue
      })
    }
  },

  post: {
    handler(request, h) {
      const { value } = request.payload

      // Validate
      const errors = []
      if (!value || value.trim().length === 0) {
        errors.push({
          text: 'Enter the value',
          href: '#value'
        })
      }

      if (errors.length > 0) {
        const name = getSessionValue(request, 'example.name')
        return h.view('examples/create-value', {
          pageTitle: 'What is the value?',
          backLink: '/example/create/name',
          errorList: errors,
          name,
          value
        })
      }

      // Store in session
      setSessionValue(request, 'example.value', value.trim())

      // Redirect to next step
      return h.redirect('/example/create/counter')
    }
  }
}
```

**View Template:**

```njk
{% extends 'layouts/page.njk' %}

{% block beforeContent %}
  {{ govukBackLink({
    text: "Back",
    href: backLink
  }) }}
{% endblock %}

{% block content %}
  {% if errorList %}
    {{ govukErrorSummary({
      titleText: "There is a problem",
      errorList: errorList
    }) }}
  {% endif %}

  <div class="govuk-grid-row">
    <div class="govuk-grid-column-two-thirds">
      <form method="POST" action="/example/create/value">
        {{ govukTextarea({
          label: {
            text: "What is the value?",
            classes: "govuk-label--l",
            isPageHeading: true
          },
          hint: {
            text: "Enter the value for '" + name + "'"
          },
          id: "value",
          name: "value",
          value: value,
          errorMessage: errorList[0] if errorList,
          rows: 5
        }) }}

        {{ govukButton({ text: "Continue" }) }}
      </form>
    </div>
  </div>
{% endblock %}
```

---

### **Page 5: Create Step 3 - Counter (/example/create/counter)**

**Purpose:** Optional third step
**Backend API:** None (session only)
**Session:** Store counter (optional)
**Method:** GET (display), POST (submit)

**GDS Components:**

- `govukInput` type="number"
- `govukButton` - Continue (primary)
- `govukButton` - Skip (secondary)
- `govukBackLink`

**Controller:**

```javascript
// src/server/examples/create-counter/controller.js
import {
  setSessionValue,
  getSessionValue,
  clearSessionValue
} from '../../common/helpers/session-helpers.js'

export const createCounterController = {
  get: {
    handler(request, h) {
      const name = getSessionValue(request, 'example.name')
      const value = getSessionValue(request, 'example.value')
      const existingCounter = getSessionValue(request, 'example.counter')

      // Guard: Redirect if previous steps incomplete
      if (!name || !value) {
        return h.redirect('/example/create/name')
      }

      return h.view('examples/create-counter', {
        pageTitle: 'Do you want to add a counter?',
        backLink: '/example/create/value',
        name,
        value,
        counter: existingCounter
      })
    }
  },

  post: {
    handler(request, h) {
      const { counter, action } = request.payload

      // Handle "Skip this question"
      if (action === 'skip') {
        clearSessionValue(request, 'example.counter')
        return h.redirect('/example/create/check')
      }

      // Validate if provided
      if (counter) {
        const counterInt = parseInt(counter, 10)

        if (isNaN(counterInt)) {
          const name = getSessionValue(request, 'example.name')
          const value = getSessionValue(request, 'example.value')

          return h.view('examples/create-counter', {
            pageTitle: 'Do you want to add a counter?',
            backLink: '/example/create/value',
            errorList: [
              {
                text: 'Counter must be a whole number',
                href: '#counter'
              }
            ],
            name,
            value,
            counter
          })
        }

        setSessionValue(request, 'example.counter', counterInt)
      } else {
        // Empty but continue clicked - clear any existing value
        clearSessionValue(request, 'example.counter')
      }

      return h.redirect('/example/create/check')
    }
  }
}
```

**View Template:**

```njk
{% extends 'layouts/page.njk' %}

{% block beforeContent %}
  {{ govukBackLink({
    text: "Back",
    href: backLink
  }) }}
{% endblock %}

{% block content %}
  {% if errorList %}
    {{ govukErrorSummary({
      titleText: "There is a problem",
      errorList: errorList
    }) }}
  {% endif %}

  <div class="govuk-grid-row">
    <div class="govuk-grid-column-two-thirds">
      <form method="POST" action="/example/create/counter">
        {{ govukInput({
          label: {
            text: "Do you want to add a counter?",
            classes: "govuk-label--l",
            isPageHeading: true
          },
          hint: {
            text: "This is optional. Enter a whole number or skip this question."
          },
          id: "counter",
          name: "counter",
          value: counter,
          type: "number",
          errorMessage: errorList[0] if errorList,
          classes: "govuk-input--width-10"
        }) }}

        <div class="govuk-button-group">
          {{ govukButton({
            text: "Continue",
            name: "action",
            value: "continue"
          }) }}

          {{ govukButton({
            text: "Skip this question",
            name: "action",
            value: "skip",
            classes: "govuk-button--secondary"
          }) }}
        </div>
      </form>
    </div>
  </div>
{% endblock %}
```

---

### **Page 6: Check Your Answers (/example/create/check)**

**Purpose:** GDS check answers pattern - final review before submission
**Backend API:** `POST /example` (on submit)
**Session:** Read all form data
**Method:** GET (display), POST (submit to backend)

**GDS Components:**

- `govukSummaryList` with change links
- `govukButton` - Create example
- `govukWarningText` - Optional warnings

**Controller:**

```javascript
// src/server/examples/create-check/controller.js
import {
  getSessionValue,
  clearSessionValue
} from '../../common/helpers/session-helpers.js'
import { exampleApi } from '../../common/helpers/api-client.js'

export const createCheckController = {
  get: {
    handler(request, h) {
      const name = getSessionValue(request, 'example.name')
      const value = getSessionValue(request, 'example.value')
      const counter = getSessionValue(request, 'example.counter')

      // Guard: Redirect if incomplete
      if (!name || !value) {
        return h.redirect('/example/create/name')
      }

      return h.view('examples/create-check', {
        pageTitle: 'Check your answers',
        name,
        value,
        counter
      })
    }
  },

  post: {
    async handler(request, h) {
      const name = getSessionValue(request, 'example.name')
      const value = getSessionValue(request, 'example.value')
      const counter = getSessionValue(request, 'example.counter')
      const traceId = request.headers['x-cdp-request-id']

      try {
        // Call backend
        await exampleApi.create({ name, value, counter }, traceId)

        // Success! Clear session
        clearSessionValue(request, 'example.name')
        clearSessionValue(request, 'example.value')
        clearSessionValue(request, 'example.counter')

        return h.redirect('/confirmation?action=created')
      } catch (error) {
        // Handle backend errors
        if (error.status === 409) {
          // Name conflict
          return h.view('examples/create-check', {
            pageTitle: 'Check your answers',
            errorList: [
              {
                text: 'An example with this name already exists. Change the name.',
                href: '/example/create/name'
              }
            ],
            name,
            value,
            counter
          })
        }

        if (error.status === 400) {
          // Validation error from backend
          return h.view('examples/create-check', {
            pageTitle: 'Check your answers',
            errorList: [
              {
                text: 'There is a problem with your answers. Check your entries.',
                href: '#'
              }
            ],
            name,
            value,
            counter
          })
        }

        // Re-throw for global error handler
        throw error
      }
    }
  }
}
```

**View Template:**

```njk
{% extends 'layouts/page.njk' %}

{% block content %}
  {% if errorList %}
    {{ govukErrorSummary({
      titleText: "There is a problem",
      errorList: errorList
    }) }}
  {% endif %}

  <div class="govuk-grid-row">
    <div class="govuk-grid-column-two-thirds">
      <h1 class="govuk-heading-l">Check your answers before creating the example</h1>

      {{ govukSummaryList({
        rows: [
          {
            key: { text: "Name" },
            value: { text: name },
            actions: {
              items: [{
                href: "/example/create/name",
                text: "Change",
                visuallyHiddenText: "name"
              }]
            }
          },
          {
            key: { text: "Value" },
            value: { text: value },
            actions: {
              items: [{
                href: "/example/create/value",
                text: "Change",
                visuallyHiddenText: "value"
              }]
            }
          },
          {
            key: { text: "Counter" },
            value: { text: counter if counter else "Not provided" },
            actions: {
              items: [{
                href: "/example/create/counter",
                text: "Change",
                visuallyHiddenText: "counter"
              }]
            }
          }
        ]
      }) }}

      <h2 class="govuk-heading-m">Now create your example</h2>

      <p class="govuk-body">
        By submitting this form you are creating a new example in the system.
      </p>

      <form method="POST" action="/example/create/check">
        {{ govukButton({
          text: "Create example"
        }) }}
      </form>
    </div>
  </div>
{% endblock %}
```

---

### **Page 7: Edit Example (/example/{id}/edit)**

**Purpose:** Edit existing example (single-page form)
**Backend API:** `GET /example/{id}` (load), `PUT /example/{id}` (save)
**Session:** None (direct form)
**Method:** GET (display), POST (submit)

**GDS Components:**

- `govukInput` for name, value
- `govukInput` type="number" for counter
- `govukButton` - Save changes (primary)
- `govukButton` - Cancel (secondary)

**Controller:**

```javascript
// src/server/examples/edit/controller.js
import { exampleApi } from '../../common/helpers/api-client.js'

export const editController = {
  get: {
    async handler(request, h) {
      const { id } = request.params
      const traceId = request.headers['x-cdp-request-id']

      try {
        const example = await exampleApi.findById(id, traceId)

        return h.view('examples/edit', {
          pageTitle: 'Edit example',
          id,
          name: example.name,
          value: example.value,
          counter: example.counter
        })
      } catch (error) {
        if (error.status === 404) {
          return h.redirect('/examples')
        }
        throw error
      }
    }
  },

  post: {
    async handler(request, h) {
      const { id } = request.params
      const { name, value, counter, action } = request.payload
      const traceId = request.headers['x-cdp-request-id']

      // Handle cancel
      if (action === 'cancel') {
        return h.redirect('/examples')
      }

      // Validate
      const errors = []
      if (!name || name.trim().length === 0) {
        errors.push({ text: 'Enter the name', href: '#name' })
      }
      if (!value || value.trim().length === 0) {
        errors.push({ text: 'Enter the value', href: '#value' })
      }
      if (counter && isNaN(parseInt(counter, 10))) {
        errors.push({ text: 'Counter must be a number', href: '#counter' })
      }

      if (errors.length > 0) {
        return h.view('examples/edit', {
          pageTitle: 'Edit example',
          id,
          errorList: errors,
          name,
          value,
          counter
        })
      }

      try {
        // Call backend
        await exampleApi.update(
          id,
          {
            name: name.trim(),
            value: value.trim(),
            counter: counter ? parseInt(counter, 10) : null
          },
          traceId
        )

        return h.redirect('/confirmation?action=updated')
      } catch (error) {
        if (error.status === 409) {
          return h.view('examples/edit', {
            pageTitle: 'Edit example',
            id,
            errorList: [
              {
                text: 'An example with this name already exists',
                href: '#name'
              }
            ],
            name,
            value,
            counter
          })
        }

        throw error
      }
    }
  }
}
```

---

### **Page 8: Confirmation (/confirmation)**

**Purpose:** GDS confirmation pattern - success message
**Backend API:** None
**Session:** None
**Method:** GET only

**GDS Components:**

- `govukPanel` - Success panel
- Links back to service

**Controller:**

```javascript
// src/server/confirmation/controller.js
export const confirmationController = {
  handler(request, h) {
    const action = request.query.action || 'completed'

    const messages = {
      created: {
        title: 'Example created',
        body: 'Your example has been successfully created.'
      },
      updated: {
        title: 'Example updated',
        body: 'Your example has been successfully updated.'
      },
      deleted: {
        title: 'Example deleted',
        body: 'Your example has been successfully deleted.'
      }
    }

    const message = messages[action] || messages.completed

    return h.view('confirmation/index', {
      pageTitle: message.title,
      panelTitle: message.title,
      panelBody: message.body
    })
  }
}
```

**View Template:**

```njk
{% extends 'layouts/page.njk' %}

{% block content %}
  {{ govukPanel({
    titleText: panelTitle,
    html: panelBody
  }) }}

  <p class="govuk-body">
    <a href="/examples" class="govuk-link">View all examples</a>
  </p>

  <p class="govuk-body">
    <a href="/" class="govuk-link">Go to start page</a>
  </p>
{% endblock %}
```

---

### **Page 9: View Example (/example/{id})** (Optional)

**Purpose:** View single example details
**Backend API:** `GET /example/{id}`
**Session:** None
**Method:** GET only

**GDS Components:**

- `govukSummaryList` (read-only)
- `govukButton` - Edit, Delete, Back

**Controller:**

```javascript
// src/server/examples/view/controller.js
import { exampleApi } from '../../common/helpers/api-client.js'

export const viewController = {
  async handler(request, h) {
    const { id } = request.params
    const traceId = request.headers['x-cdp-request-id']

    try {
      const example = await exampleApi.findById(id, traceId)

      return h.view('examples/view', {
        pageTitle: example.name,
        example
      })
    } catch (error) {
      if (error.status === 404) {
        return h.redirect('/examples')
      }
      throw error
    }
  }
}
```

---

## Backend API Client Implementation

### **API Client Module**

**File:** `src/server/common/helpers/api-client.js`

```javascript
import fetch from 'node-fetch'
import { config } from '../../../config/config.js'
import { createLogger } from '../logging/logger.js'

const logger = createLogger()
const baseUrl = config.get('backendApi.baseUrl')

/**
 * Example API client for backend integration
 * Demonstrates CDP patterns:
 * - Trace ID propagation
 * - Error handling
 * - Structured logging
 */
export const exampleApi = {
  /**
   * Fetch all examples
   * @param {string} traceId - Request trace ID
   * @returns {Promise<Array>} List of examples
   */
  async findAll(traceId) {
    logger.info('Fetching all examples from backend')

    const response = await fetch(`${baseUrl}/example`, {
      headers: {
        'x-cdp-request-id': traceId
      }
    })

    if (!response.ok) {
      logger.error(`Backend error: ${response.status}`)
      throw createError(response)
    }

    const data = await response.json()
    logger.info(`Fetched ${data.length} examples`)
    return data
  },

  /**
   * Create new example
   * @param {Object} data - Example data {name, value, counter}
   * @param {string} traceId - Request trace ID
   * @returns {Promise<Object>} Created example
   */
  async create(data, traceId) {
    logger.info(`Creating example: ${data.name}`)

    const response = await fetch(`${baseUrl}/example`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cdp-request-id': traceId
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      logger.error(`Backend error creating example: ${response.status}`)
      throw createError(response)
    }

    const created = await response.json()
    logger.info(`Created example with id: ${created.id}`)
    return created
  },

  /**
   * Get example by ID
   * @param {string} id - Example ID
   * @param {string} traceId - Request trace ID
   * @returns {Promise<Object>} Example
   */
  async findById(id, traceId) {
    logger.info(`Fetching example: ${id}`)

    const response = await fetch(`${baseUrl}/example/${id}`, {
      headers: {
        'x-cdp-request-id': traceId
      }
    })

    if (!response.ok) {
      logger.error(`Backend error fetching example: ${response.status}`)
      throw createError(response)
    }

    return response.json()
  },

  /**
   * Update example
   * @param {string} id - Example ID
   * @param {Object} data - Updated data {name, value, counter}
   * @param {string} traceId - Request trace ID
   * @returns {Promise<Object>} Updated example
   */
  async update(id, data, traceId) {
    logger.info(`Updating example: ${id}`)

    const response = await fetch(`${baseUrl}/example/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-cdp-request-id': traceId
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      logger.error(`Backend error updating example: ${response.status}`)
      throw createError(response)
    }

    const updated = await response.json()
    logger.info(`Updated example: ${id}`)
    return updated
  },

  /**
   * Delete example
   * @param {string} id - Example ID
   * @param {string} traceId - Request trace ID
   */
  async delete(id, traceId) {
    logger.info(`Deleting example: ${id}`)

    const response = await fetch(`${baseUrl}/example/${id}`, {
      method: 'DELETE',
      headers: {
        'x-cdp-request-id': traceId
      }
    })

    if (!response.ok) {
      logger.error(`Backend error deleting example: ${response.status}`)
      throw createError(response)
    }

    logger.info(`Deleted example: ${id}`)
  }
}

/**
 * Create error object from response
 * @param {Response} response - Fetch response
 * @returns {Error} Error with status code
 */
function createError(response) {
  const error = new Error(
    `Backend error: ${response.status} ${response.statusText}`
  )
  error.status = response.status
  return error
}
```

---

## Session Helper Functions

**File:** `src/server/common/helpers/session-helpers.js`

```javascript
/**
 * Session helper functions for @hapi/yar
 * Demonstrates CDP session management patterns
 */

/**
 * Store a value in the user's session
 * @param {Request} request - Hapi request object
 * @param {string} key - Session key (e.g., 'example.name')
 * @param {*} value - Value to store (JSON-serializable)
 */
export function setSessionValue(request, key, value) {
  request.yar.set(key, value)
}

/**
 * Retrieve a value from the user's session
 * @param {Request} request - Hapi request object
 * @param {string} key - Session key
 * @returns {*} The stored value, or null if not found
 */
export function getSessionValue(request, key) {
  if (request.yar) {
    return request.yar.get(key)
  }
  return null
}

/**
 * Clear a specific value from session
 * @param {Request} request - Hapi request object
 * @param {string} key - Session key to clear
 */
export function clearSessionValue(request, key) {
  request.yar.clear(key)
}

/**
 * Clear all session data
 * @param {Request} request - Hapi request object
 */
export function clearSession(request) {
  request.yar.reset()
}

/**
 * Get all session data (debugging only)
 * @param {Request} request - Hapi request object
 * @returns {Object} All session data
 */
export function getSessionData(request) {
  return request.yar._store || {}
}
```

---

## Configuration Updates

### **Add Backend URL Config**

**File:** `src/config/config.js`

```javascript
// Add to existing config object
backendApi: {
  baseUrl: {
    doc: 'Backend API base URL',
    format: String,
    default: 'http://trade-demo-backend:8085',
    env: 'BACKEND_API_URL'
  }
}
```

### **Environment Variables**

| Environment | BACKEND_API_URL                                       |
| ----------- | ----------------------------------------------------- |
| **Local**   | `http://trade-demo-backend:8085`                      |
| **Dev**     | `https://trade-demo-backend.dev.cdp-int.defra.cloud`  |
| **Test**    | `https://trade-demo-backend.test.cdp-int.defra.cloud` |
| **Prod**    | `https://trade-demo-backend.cdp-int.defra.cloud`      |

---

## Implementation Phases

### **Phase 1: Project Setup ⬜**

**Tasks:**

- [ ] Create repository from cdp-node-frontend-template
- [ ] Update package.json (name, description)
- [ ] Update config serviceName
- [ ] Add backend URL to config
- [ ] Create session-helpers.js
- [ ] Test template runs locally

**Files:**

- `package.json` - Update metadata
- `src/config/config.js` - Add backend URL
- `src/server/common/helpers/session-helpers.js` - NEW

---

### **Phase 2: Backend API Client ⬜**

**Tasks:**

- [ ] Create api-client.js module
- [ ] Implement findAll() method
- [ ] Implement create() method
- [ ] Implement findById() method
- [ ] Implement update() method
- [ ] Implement delete() method
- [ ] Add error handling
- [ ] Add unit tests

**Files:**

- `src/server/common/helpers/api-client.js` - NEW
- `src/server/common/helpers/api-client.test.js` - NEW

---

### **Phase 3: Core Pages ⬜**

**Tasks:**

- [ ] Create start page (/)
- [ ] Create examples list page (/examples)
- [ ] Implement client-side search
- [ ] Add table with actions
- [ ] Test backend integration

**Files:**

- `src/server/start/index.js` - NEW
- `src/server/start/controller.js` - NEW
- `src/server/start/index.njk` - NEW
- `src/server/examples/index.js` - NEW
- `src/server/examples/controller.js` - NEW
- `src/server/examples/list.njk` - NEW

---

### **Phase 4: Multi-Step Create Form ⬜**

**Tasks:**

- [ ] Create name page (step 1)
- [ ] Create value page (step 2)
- [ ] Create counter page (step 3)
- [ ] Create check answers page
- [ ] Implement session storage
- [ ] Implement validation
- [ ] Implement backend submission
- [ ] Test full flow

**Files:**

- `src/server/examples/create-name/` - NEW
- `src/server/examples/create-value/` - NEW
- `src/server/examples/create-counter/` - NEW
- `src/server/examples/create-check/` - NEW

---

### **Phase 5: Edit & Confirmation ⬜**

**Tasks:**

- [ ] Create edit page
- [ ] Create confirmation page
- [ ] Create view page (optional)
- [ ] Implement delete action
- [ ] Test all CRUD operations

**Files:**

- `src/server/examples/edit/` - NEW
- `src/server/confirmation/` - NEW
- `src/server/examples/view/` - NEW (optional)

---

### **Phase 6: Docker Integration ⬜**

**Tasks:**

- [ ] Update compose.yml for backend connection
- [ ] Configure cdp-tenant network
- [ ] Test local Docker Compose
- [ ] Verify Redis session storage
- [ ] Document startup sequence

**Files:**

- `compose.yml` - Update

---

### **Phase 7: Testing ⬜**

**Tasks:**

- [ ] Unit tests for controllers
- [ ] Unit tests for API client
- [ ] Integration tests for multi-step flow
- [ ] Session management tests
- [ ] Error handling tests

---

### **Phase 8: Documentation ⬜**

**Tasks:**

- [ ] Update README
- [ ] Document environment variables
- [ ] Document local development setup
- [ ] Document multi-step form pattern
- [ ] Add architecture diagram

---

## Success Criteria ✅

Mark complete when:

1. ✅ All 9 pages implemented and working
2. ✅ Multi-step form with session management
3. ✅ Backend integration with trace ID
4. ✅ Client-side search functional
5. ✅ All CRUD operations work
6. ✅ Error handling complete
7. ✅ Works in Docker Compose with backend
8. ✅ All tests passing
9. ✅ Documentation complete

---

## File Structure

```
trade-demo-frontend/
├── src/
│   ├── config/
│   │   └── config.js                           ✏️ Add backend URL
│   ├── server/
│   │   ├── common/
│   │   │   └── helpers/
│   │   │       ├── api-client.js               🆕 Backend API client
│   │   │       ├── api-client.test.js          🆕 Tests
│   │   │       └── session-helpers.js          🆕 Session utilities
│   │   ├── start/
│   │   │   ├── index.js                        🆕 Start page plugin
│   │   │   ├── controller.js                   🆕 Controller
│   │   │   └── index.njk                       🆕 View
│   │   ├── examples/
│   │   │   ├── index.js                        🆕 Examples plugin
│   │   │   ├── controller.js                   🆕 List controller
│   │   │   ├── list.njk                        🆕 List view
│   │   │   ├── create-name/                    🆕 Step 1
│   │   │   ├── create-value/                   🆕 Step 2
│   │   │   ├── create-counter/                 🆕 Step 3
│   │   │   ├── create-check/                   🆕 Check answers
│   │   │   ├── edit/                           🆕 Edit page
│   │   │   └── view/                           🆕 View page
│   │   ├── confirmation/
│   │   │   ├── index.js                        🆕 Confirmation plugin
│   │   │   ├── controller.js                   🆕 Controller
│   │   │   └── index.njk                       🆕 View
│   │   └── router.js                           ✏️ Register new plugins
├── compose.yml                                  ✏️ Add backend connection
├── package.json                                 ✏️ Update metadata
└── README.md                                    ✏️ Update docs
```

**Legend:**

- 🆕 New file to create
- ✏️ Existing file to modify

---

**Last Updated:** 2025-10-03
**Status:** ⬜ Ready to begin Phase 1
