# IPAFFS Live Animals Page Specifications (CHED-A)

This document specifies the page designs for the CHED-A (live animals) import notification journey in IPAFFS. These specifications are for implementing an MVP prototype using Hapi.js and GOV.UK Design System.

**Scope:** Live animals imports only (CHED-A / CVEDA)
**Simplifications:** Single instances of fields (no repeating sections), core MVP flow only

---

## Screen 1: Origin of the Import

**Route**: `GET/POST /protected/notifications/consignment-origin`

### Page Structure

```
┌─────────────────────────────────────────┐
│ GOV.UK Header                           │
│ Import live animals notification       │
├─────────────────────────────────────────┤
│                                         │
│ [H1] Select the country where the      │
│      animal originates from            │
│                                         │
│ [Form]                                  │
│                                         │
│ Country or region                       │
│ [Select dropdown - searchable]          │
│ Select a country                        │
│ - - - - - - - - - - - - - - - - - - -   │
│ Afghanistan                             │
│ Albania                                 │
│ Algeria                                 │
│ ...                                     │
│ United Kingdom                          │
│  └─ England                             │
│  └─ Northern Ireland                    │
│  └─ Scotland                            │
│  └─ Wales                               │
│ ...                                     │
│ Zimbabwe                                │
│                                         │
│ [Button] Save and continue              │
│                                         │
└─────────────────────────────────────────┘
```

### Data Captured

- `origin-country` (string, ISO country code) - Stored in notification as:
  - `partOne.commodities.countryOfOrigin` (for countries)
  - `partOne.commodities.regionOfOrigin` (for UK regions, format: "GB-[region]")

### Hardcoded/Auto-populated

- `type` = 'CVEDA' (CHED-A for live animals)
- `consignedCountry` - Auto-populated as 'GB' (United Kingdom) for imports
- `personResponsible` - Populated from logged-in user

### GOV.UK Components

- `govuk-label` (for country selection)
- `govuk-select` or autocomplete (searchable country dropdown)
- `govuk-button` (Save and continue)
- `govuk-error-summary` (if validation fails)
- `govuk-error-message` (inline field error)

### Validation Rules

Validation schema:

```javascript
{
  'origin-country': Joi.string().required().messages({
    'string.empty': 'Select the country where the animal or product originates from',
    'any.required': 'Select the country where the animal or product originates from'
  }),

  type: Joi.string().valid('CVEDA').required()
}
```

### Error Messages

- **Missing country:** "Select the country where the animal or product originates from"

### Conditional Logic

- UK regions appear as sub-items under "United Kingdom" in the dropdown
- If UK region selected, saved as `GB-ENG`, `GB-NIR`, `GB-SCT`, or `GB-WLS`
- For high-risk countries only: filters may apply (MVP: show all countries)

### Next Page

Redirects to: `/protected/notifications/{referenceNumber}/consignment/page-5` (Purpose page)

---

## Screen 2: What is the main reason for importing the animals?

**Route**: `GET/POST /protected/notifications/{referenceNumber}/consignment/page-5`

### Page Structure

```
┌─────────────────────────────────────────┐
│ GOV.UK Header                           │
│ Import live animals notification       │
├─────────────────────────────────────────┤
│                                         │
│ [Back link] Back                        │
│                                         │
│ [H1] What is the main reason for        │
│      importing the animals?            │
│                                         │
│ [Form]                                  │
│                                         │
│ [Radio buttons]                         │
│ ○ For import into Great Britain or      │
│   Northern Ireland                      │
│                                         │
│   [Conditional reveal]                  │
│   What are the animals for?             │
│   [Select dropdown]                     │
│   Select a reason                       │
│   - - - - - - - - - - - - - - - - - -   │
│   Approved premises or bodies           │
│   Breeding or production                │
│   Companion animal                      │
│   Production                            │
│   Racing and competition                │
│   Registered horses                     │
│   Rescue or rehabilitation              │
│   Research                              │
│   Restocking                            │
│   Slaughter                             │
│                                         │
│ ○ To pass through Great Britain or      │
│   Northern Ireland to another country   │
│   (transit)                             │
│                                         │
│   [Conditional reveal]                  │
│   Destination country                   │
│   [Select dropdown]                     │
│   Select a country                      │
│                                         │
│   Exit border control post              │
│   [Select dropdown]                     │
│   Select a BCP                          │
│                                         │
│   NCTS MRN                              │
│   [Text input - 18 characters]          │
│   For example: 23GB00000000000012345    │
│                                         │
│   Estimated arrival at exit date        │
│   [Date input - 3 fields]               │
│   Day [__] Month [__] Year [____]       │
│                                         │
│   Estimated arrival at exit time        │
│   Hour [__] Minute [__]                 │
│   For example: 14 30                    │
│                                         │
│ ○ To be transferred to a vessel         │
│   (transhipment)                        │
│                                         │
│   [Conditional reveal]                  │
│   Destination country                   │
│   [Select dropdown]                     │
│   Select a country                      │
│                                         │
│ ○ Temporary admission (re-export)       │
│                                         │
│   [Conditional reveal]                  │
│   Exit border control post              │
│   [Select dropdown]                     │
│   Select a BCP                          │
│                                         │
│   Exit date                             │
│   [Date input - 3 fields]               │
│   Day [__] Month [__] Year [____]       │
│                                         │
│ ○ Re-entry after temporary export       │
│                                         │
│ [Button] Save and continue              │
│                                         │
└─────────────────────────────────────────┘
```

### Data Captured

**Core field:**

- `purpose` (string, required) - Values: 'internalmarket', 'transit', 'tranship', 'temporary', 're-entry'
- Stored in: `partOne.purpose.purposeGroup`

**Internal Market (purpose='internalmarket'):**

- `internalMarket` (string, required) - Specific reason for import
  - Values: 'commercial', 'rescue', 'breeding', 'research', 'racing', 'premises', 'companion', 'production', 'slaughter', 'fattening', 'restocking', 'horses'
- Stored in: `partOne.purpose.forImportOrAdmission`

**Transit (purpose='transit'):**

- `third-country` (string, required) - Destination country ISO code
- `bcp-transit-third-country` (string, required) - Exit BCP code
- `ncts-mrn` (string, 18 characters, pattern validated) - NCTS Movement Reference Number
- `estimated-arrival-at-port-of-exit-date` (date, required) - Combined from day/month/year
- `estimated-arrival-at-port-of-exit-time` (time, required) - Combined from hour/minutes
- Stored in:
  - `partOne.purpose.thirdCountryTranshipment` (destination)
  - `partOne.purpose.exitBCP` (BCP code)
  - `partOne.purpose.transitThirdCountries` (array)
  - `partOne.purpose.finalBCP` (exit BCP)
  - `partOne.purpose.exitDate` (ISO datetime)

**Transhipment (purpose='tranship'):**

- `third-country-transhipment` (string, required) - Destination country ISO code
- Stored in: `partOne.purpose.thirdCountryTranshipment`

**Temporary Admission (purpose='temporary'):**

- `bcp-temporary-admission` (string, required) - Exit BCP code
- `exit-date` (date, required) - Combined from day/month/year fields
- Stored in:
  - `partOne.purpose.exitBCP`
  - `partOne.purpose.exitDate` (ISO date)

**Re-entry (purpose='re-entry'):**

- No additional fields required

### GOV.UK Components

- `govuk-back-link`
- `govuk-radios` (main purpose selection)
- `govuk-radios__conditional` (conditional reveal sections)
- `govuk-select` (country and BCP dropdowns, internal market reason)
- `govuk-input` (NCTS MRN, time fields)
- `govuk-date-input` (exit date, estimated arrival date)
- `govuk-button` (Save and continue)
- `govuk-error-summary`
- `govuk-error-message`

### Validation Rules

```javascript
// Core validation
{
  purpose: Joi.string()
    .valid('internalmarket', 'transit', 'tranship', 'temporary', 're-entry')
    .required()
    .messages({
      'any.only': 'Select the purpose of the consignment',
      'any.required': 'Select the purpose of the consignment'
    })
}

// Internal market validation
{
  internalMarket: Joi.when('purpose', {
    is: 'internalmarket',
    then: Joi.string()
      .valid('commercial', 'rescue', 'breeding', 'research', 'racing',
             'premises', 'companion', 'production', 'slaughter',
             'fattening', 'restocking', 'horses')
      .required()
      .messages({
        'any.required': 'Select what the animals are for',
        'string.empty': 'Select what the animals are for'
      })
  })
}

// Transit validation
{
  'third-country': Joi.when('purpose', {
    is: 'transit',
    then: Joi.string().required().messages({
      'any.required': 'Select a destination country',
      'string.empty': 'Select a destination country'
    })
  }),

  'bcp-transit-third-country': Joi.when('purpose', {
    is: 'transit',
    then: Joi.string().required().messages({
      'any.required': 'Select an exit border control post',
      'string.empty': 'Select an exit border control post'
    })
  }),

  'ncts-mrn': Joi.when('purpose', {
    is: 'transit',
    then: Joi.string().length(18).pattern(/^[0-9]{2}[A-Z]{2}[0-9A-Z]{14}$/).messages({
      'string.length': 'NCTS MRN must be exactly 18 characters',
      'string.pattern.base': 'NCTS MRN must match the format: 2 digits, 2 letters, 14 alphanumeric characters'
    })
  }),

  'estimated-arrival-at-port-of-exit-date': Joi.when('purpose', {
    is: 'transit',
    then: Joi.date().iso().required().messages({
      'date.base': 'Enter a valid exit date',
      'any.required': 'Enter the estimated arrival date at the exit point'
    })
  }),

  'estimated-arrival-at-port-of-exit-time': Joi.when('purpose', {
    is: 'transit',
    then: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required().messages({
      'string.pattern.base': 'Enter a valid time in 24-hour format',
      'any.required': 'Enter the estimated arrival time at the exit point'
    })
  })
}

// Transhipment validation
{
  'third-country-transhipment': Joi.when('purpose', {
    is: 'tranship',
    then: Joi.string().required().messages({
      'any.required': 'Select a destination country',
      'string.empty': 'Select a destination country'
    })
  })
}

// Temporary admission validation
{
  'bcp-temporary-admission': Joi.when('purpose', {
    is: 'temporary',
    then: Joi.string().required().messages({
      'any.required': 'Select an exit border control post',
      'string.empty': 'Select an exit border control post'
    })
  }),

  'exit-date': Joi.when('purpose', {
    is: 'temporary',
    then: Joi.date().iso().min('now').required().messages({
      'date.base': 'Enter a valid exit date',
      'date.min': 'Exit date must be in the future',
      'any.required': 'Enter the exit date'
    })
  })
}
```

### Error Messages

- **No purpose selected:** "Select the purpose of the consignment"
- **Internal market - no reason:** "Select what the animals are for"
- **Transit - no destination:** "Select a destination country"
- **Transit - no exit BCP:** "Select an exit border control post"
- **Transit - invalid NCTS MRN:** "NCTS MRN must be exactly 18 characters" or pattern error
- **Transit - no exit date:** "Enter the estimated arrival date at the exit point"
- **Transit - no exit time:** "Enter the estimated arrival time at the exit point"
- **Transit - invalid time format:** "Enter a valid time in 24-hour format"
- **Transhipment - no destination:** "Select a destination country"
- **Temporary - no exit BCP:** "Select an exit border control post"
- **Temporary - no exit date:** "Enter the exit date"
- **Temporary - exit date in past:** "Exit date must be in the future"

### Conditional Logic

- Only one purpose can be selected at a time
- Conditional reveal sections show/hide based on radio selection
- NCTS MRN format: 2 digits (year) + 2 letters (country) + 14 alphanumeric
- Date fields combine day/month/year into ISO date string for storage
- Time fields combine hour/minute into HH:mm format

### Next Page

- Internal Market → `/protected/notifications/{referenceNumber}/consignment/details`
- Transit → `/protected/notifications/{referenceNumber}/consignment/details`
- Others → `/protected/notifications/{referenceNumber}/consignment/details`

---

## Screen 3: Additional Animal Details

**Route**: `GET/POST /protected/notifications/{referenceNumber}/consignment/details`

### Page Structure

```
┌─────────────────────────────────────────┐
│ GOV.UK Header                           │
│ Import live animals notification       │
├─────────────────────────────────────────┤
│                                         │
│ [Back link] Back                        │
│                                         │
│ [H1] Additional animal details          │
│                                         │
│ [Form]                                  │
│                                         │
│ Total gross weight (optional)           │
│ [Text input - numeric]                  │
│ Weight in kilograms                     │
│                                         │
│ [Text input - small]                    │
│ . [___] Decimal places (max 5 digits)   │
│                                         │
│ Temperature                             │
│ [Radio buttons]                         │
│ ○ Ambient                               │
│ ○ Chilled                               │
│ ○ Frozen                                │
│                                         │
│ [Inset text]                            │
│ The following questions are specific to │
│ live animals                            │
│                                         │
│ Animal certified as                     │
│ [Radio buttons]                         │
│ ○ Breeding                              │
│ ○ Production                            │
│ ○ Slaughter                             │
│                                         │
│ [Checkbox]                              │
│ ☐ Including animals that are unweaned   │
│                                         │
│ Is the consignment in a container?      │
│ [Radio buttons]                         │
│ ○ Yes                                   │
│ ○ No                                    │
│                                         │
│ [Conditional reveal - if Yes]           │
│                                         │
│ Container number                        │
│ [Text input - max 32 characters]        │
│                                         │
│ Seal number                             │
│ [Text input - max 100 characters]       │
│                                         │
│ [Checkbox]                              │
│ ☐ Official seal                         │
│                                         │
│ [Button] Save and continue              │
│                                         │
└─────────────────────────────────────────┘
```

### Data Captured

**Core fields:**

- `gross-weight` (number, optional) - Total gross weight in kilograms
- `gross-weight-decimal` (string, max 5 chars, optional) - Decimal places for weight
- `temperature` (string, optional) - Values: 'ambient', 'chilled', 'frozen'
- Stored in: `partOne.commodities.temperature`

**CHED-A specific:**

- `animal-certified-as` (string, optional) - Values: 'breeding', 'production', 'slaughter'
- `including-non-ablacted` (boolean, optional) - Whether unweaned animals included
- Stored in: `partOne.commodities.animalsCertifiedAs`, `partOne.commodities.includesNonAblactedAnimals`

**Container fields:**

- `consignment-in-container` (boolean, required) - Whether shipped in container
- `container-number` (string, max 32, conditionally required) - Container identifier
- `seal-number` (string, max 100, conditionally required) - Seal identifier
- `official-seal` (boolean, optional) - Whether seal is official
- Stored in:
  - `partOne.consignmentCheck.sealContainersSealsNumbers` (array with single entry)
  - Format: `{ containerNumber: string, sealNumber: string, isOfficial: boolean }`

### GOV.UK Components

- `govuk-back-link`
- `govuk-input` (gross weight, container/seal numbers)
- `govuk-input--width-5` (decimal places input)
- `govuk-radios` (temperature, certified-as, consignment-in-container)
- `govuk-checkboxes` (including non-ablacted, official seal)
- `govuk-inset-text` (CHED-A specific field notice)
- `govuk-button`
- `govuk-error-summary`
- `govuk-error-message`

### Validation Rules

```javascript
{
  'gross-weight': Joi.number().positive().optional().messages({
    'number.base': 'Total gross weight must be a number',
    'number.positive': 'Total gross weight must be a positive number'
  }),

  'gross-weight-decimal': Joi.string().max(5).optional().messages({
    'string.max': 'Decimal places cannot exceed 5 digits'
  }),

  temperature: Joi.string()
    .valid('ambient', 'chilled', 'frozen')
    .optional()
    .allow(''),

  'animal-certified-as': Joi.string()
    .valid('breeding', 'production', 'slaughter')
    .optional()
    .allow(''),

  'including-non-ablacted': Joi.boolean().optional(),

  'consignment-in-container': Joi.string()
    .valid('true', 'false')
    .required()
    .messages({
      'any.required': 'Select whether the consignment is in a container'
    }),

  'container-number': Joi.when('consignment-in-container', {
    is: 'true',
    then: Joi.string().max(32).required().messages({
      'any.required': 'Enter a container number',
      'string.max': 'Container number must be 32 characters or fewer'
    }),
    otherwise: Joi.optional()
  }),

  'seal-number': Joi.when('consignment-in-container', {
    is: 'true',
    then: Joi.string().max(100).required().messages({
      'any.required': 'Enter a seal number',
      'string.max': 'Seal number must be 100 characters or fewer'
    }),
    otherwise: Joi.optional()
  }),

  'official-seal': Joi.boolean().optional()
}
```

### Error Messages

- **Invalid gross weight:** "Total gross weight must be a number"
- **Negative gross weight:** "Total gross weight must be a positive number"
- **Too many decimal places:** "Decimal places cannot exceed 5 digits"
- **No container selection:** "Select whether the consignment is in a container"
- **Container selected but no container number:** "Enter a container number"
- **Container number too long:** "Container number must be 32 characters or fewer"
- **Container selected but no seal number:** "Enter a seal number"
- **Seal number too long:** "Seal number must be 100 characters or fewer"

### Conditional Logic

- Container number and seal number fields only shown when `consignment-in-container` = 'Yes'
- Official seal checkbox only shown when container fields are visible
- CHED-A specific fields (certified-as, non-ablacted) always shown for live animals
- Temperature is optional for all types

### Next Page

For CHED-A: `/protected/notifications/{referenceNumber}/traders` (Traders overview)

---

## Screen 4a: Search for Consignor

**Route**: `GET/POST /protected/notifications/{referenceNumber}/traders/consignor/search`

### Page Structure

```
┌─────────────────────────────────────────┐
│ GOV.UK Header                           │
│ Import live animals notification       │
├─────────────────────────────────────────┤
│                                         │
│ [Back link] Back                        │
│                                         │
│ [H1] Search for an existing place of    │
│      origin                             │
│                                         │
│ [Link] Add a new place of origin        │
│                                         │
│ [Form - Search filters]                 │
│                                         │
│ Name                                    │
│ [Text input - max 255]                  │
│                                         │
│ Address                                 │
│ [Text input - max 255]                  │
│                                         │
│ Country                                 │
│ [Select dropdown]                       │
│ All countries                           │
│                                         │
│ Approval number                         │
│ [Text input - max 255]                  │
│                                         │
│ [Button] Search                         │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ [Results - if search performed]         │
│                                         │
│ Showing X results                       │
│                                         │
│ [Table]                                 │
│ Name      │ Address        │ Actions   │
│ ──────────┼────────────────┼──────────│
│ Smith Farm│ 123 Farm Lane, │ [View]   │
│           │ Devon, UK      │          │
│ ──────────┼────────────────┼──────────│
│ Jones Ltd │ 45 High Street,│ [View]   │
│           │ London, UK     │          │
│                                         │
│ [Pagination]                            │
│ Previous  1  2  3  Next                 │
│                                         │
└─────────────────────────────────────────┘
```

### Data Captured

**Search filters (all optional):**

- `name` (string, max 255) - Trader name search
- `address` (string, max 255) - Address search
- `country` (string) - Country filter (ISO code)
- `approvalNumber` (string, max 255) - Approval number search
- `page` (number) - Current page number (for pagination)

**Action:**

- `view-id` (string) - Economic operator ID when "View" clicked
- Results in redirecting to view page for that economic operator

### GOV.UK Components

- `govuk-back-link`
- `govuk-heading-l` (page title)
- `govuk-link` (Add new link)
- `govuk-label` (field labels)
- `govuk-input` (name, address, approval number)
- `govuk-select` (country dropdown)
- `govuk-button` (Search)
- `govuk-table` (results display)
- `govuk-pagination` (if more than 20 results)

### Validation Rules

```javascript
{
  name: Joi.string().max(255).optional().allow('').messages({
    'string.max': 'Name must be 255 characters or fewer'
  }),

  address: Joi.string().max(255).optional().allow('').messages({
    'string.max': 'Address must be 255 characters or fewer'
  }),

  country: Joi.string().optional().allow(''),

  approvalNumber: Joi.string().max(255).optional().allow('').messages({
    'string.max': 'Approval number must be 255 characters or fewer'
  }),

  page: Joi.number().integer().min(1).optional()
}
```

### Search Behavior

**API Call:**
Calls `economicOperatorService.searchEconomicOperators()` with:

- `skip`: (page - 1) × 20
- `numberOfResults`: 20
- `payload`: Array with search criteria
- `masterTypes`: ['consignor'] for consignor search

**Results Display:**

- Shows up to 20 results per page
- Table columns: Name, Address, Actions
- "View" button for each result redirects to: `/protected/notifications/{referenceNumber}/consignor/view/{economicOperatorId}`
- Pagination controls if more than 20 results

**Empty State:**
If no results found:

- Shows message: "No results found"
- Prompts to refine search or add new trader

### Error Messages

- **Name too long:** "Name must be 255 characters or fewer"
- **Address too long:** "Address must be 255 characters or fewer"
- **Approval number too long:** "Approval number must be 255 characters or fewer"

### Links

- **Add new link:** `/protected/notifications/{referenceNumber}/traders/consignor/new`
- **View button:** `/protected/notifications/{referenceNumber}/consignor/view/{economicOperatorId}`

### Next Page

After viewing and selecting a consignor: Redirects to `/protected/notifications/{referenceNumber}/consignor/confirmation/{economicOperatorId}`

---

## Screen 4b: Create New Consignor

**Route**: `GET/POST /protected/notifications/{referenceNumber}/traders/consignor/new`

### Page Structure

```
┌─────────────────────────────────────────┐
│ GOV.UK Header                           │
│ Import live animals notification       │
├─────────────────────────────────────────┤
│                                         │
│ [Back link] Back to search              │
│                                         │
│ [H1] Add a new place of origin          │
│                                         │
│ [Form]                                  │
│                                         │
│ Company name                            │
│ [Text input - max 255]                  │
│                                         │
│ Country                                 │
│ [Select dropdown]                       │
│ Select a country                        │
│                                         │
│ Address line 1                          │
│ [Text input - max 255]                  │
│                                         │
│ Address line 2 (optional)               │
│ [Text input - max 255]                  │
│                                         │
│ Address line 3 (optional)               │
│ [Text input - max 255]                  │
│                                         │
│ Town or city                            │
│ [Text input - max 255]                  │
│                                         │
│ Postcode (if UK address)                │
│ [Text input - max 50]                   │
│                                         │
│ Email address (optional)                │
│ [Text input - email format, max 100]    │
│                                         │
│ Telephone number (optional)             │
│ [Text input - max 50]                   │
│                                         │
│ [Button] Save and continue              │
│                                         │
└─────────────────────────────────────────┘
```

### Data Captured

Creates Economic Operator entity with:

- `companyName` (string, required, max 255)
- `country` (string, required) - ISO country code
- `addressLine1` (string, required, max 255)
- `addressLine2` (string, optional, max 255)
- `addressLine3` (string, optional, max 255)
- `city` (string, required, max 255)
- `postalCode` (string, conditionally required, max 50) - Required if country = 'GB'
- `email` (string, optional, email format, max 100)
- `telephone` (string, optional, max 50)

Stored as Economic Operator via API: `POST /economicoperator`

### GOV.UK Components

- `govuk-back-link`
- `govuk-label` (all field labels)
- `govuk-input` (all text inputs)
- `govuk-input--width-10` (postcode)
- `govuk-select` (country)
- `govuk-button`
- `govuk-error-summary`
- `govuk-error-message`

### Validation Rules

```javascript
{
  companyName: Joi.string().max(255).required().messages({
    'string.empty': 'Enter the company name',
    'any.required': 'Enter the company name',
    'string.max': 'Company name must be 255 characters or fewer'
  }),

  country: Joi.string().required().messages({
    'string.empty': 'Select a country',
    'any.required': 'Select a country'
  }),

  addressLine1: Joi.string().max(255).required().messages({
    'string.empty': 'Enter address line 1',
    'any.required': 'Enter address line 1',
    'string.max': 'Address line 1 must be 255 characters or fewer'
  }),

  addressLine2: Joi.string().max(255).optional().allow('').messages({
    'string.max': 'Address line 2 must be 255 characters or fewer'
  }),

  addressLine3: Joi.string().max(255).optional().allow('').messages({
    'string.max': 'Address line 3 must be 255 characters or fewer'
  }),

  city: Joi.string().max(255).required().messages({
    'string.empty': 'Enter a town or city',
    'any.required': 'Enter a town or city',
    'string.max': 'Town or city must be 255 characters or fewer'
  }),

  postalCode: Joi.when('country', {
    is: 'GB',
    then: Joi.string().max(50).required().messages({
      'string.empty': 'Enter a postcode',
      'any.required': 'Enter a postcode',
      'string.max': 'Postcode must be 50 characters or fewer'
    }),
    otherwise: Joi.string().max(50).optional().allow('').messages({
      'string.max': 'Postcode must be 50 characters or fewer'
    })
  }),

  email: Joi.string().email().max(100).optional().allow('').messages({
    'string.email': 'Enter an email address in the correct format, like name@example.com',
    'string.max': 'Email address must be 100 characters or fewer'
  }),

  telephone: Joi.string().max(50).optional().allow('').messages({
    'string.max': 'Telephone number must be 50 characters or fewer'
  })
}
```

### Error Messages

- **No company name:** "Enter the company name"
- **Company name too long:** "Company name must be 255 characters or fewer"
- **No country:** "Select a country"
- **No address line 1:** "Enter address line 1"
- **Address line too long:** "Address line [X] must be 255 characters or fewer"
- **No city:** "Enter a town or city"
- **City too long:** "Town or city must be 255 characters or fewer"
- **No postcode (UK address):** "Enter a postcode"
- **Postcode too long:** "Postcode must be 50 characters or fewer"
- **Invalid email:** "Enter an email address in the correct format, like name@example.com"
- **Email too long:** "Email address must be 100 characters or fewer"
- **Telephone too long:** "Telephone number must be 50 characters or fewer"

### Conditional Logic

- Postcode is required only when country = 'GB' (United Kingdom)
- All optional fields can be left blank

### Next Page

After successful creation: Redirects to `/protected/notifications/{referenceNumber}/consignor/confirmation/{economicOperatorId}?fromCreate=true`

---

## Screen 4c: Search for Consignee

**Route**: `GET/POST /protected/notifications/{referenceNumber}/traders/consignee/search`

### Page Structure

```
┌─────────────────────────────────────────┐
│ GOV.UK Header                           │
│ Import live animals notification       │
├─────────────────────────────────────────┤
│                                         │
│ [Back link] Back                        │
│                                         │
│ [H1] Search for an existing consignee   │
│                                         │
│ [Link] Add a new consignee              │
│                                         │
│ [Form - Search filters]                 │
│                                         │
│ Name                                    │
│ [Text input - max 255]                  │
│                                         │
│ Address                                 │
│ [Text input - max 255]                  │
│                                         │
│ Postcode                                │
│ [Text input - max 10]                   │
│                                         │
│ Approval number                         │
│ [Text input - max 255]                  │
│                                         │
│ [Button] Search                         │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ [Results - if search performed]         │
│                                         │
│ Showing X results                       │
│                                         │
│ [Table]                                 │
│ Name      │ Address        │ Actions   │
│ ──────────┼────────────────┼──────────│
│ ABC Ltd   │ 789 Business   │ [View]   │
│           │ Park, Leeds    │          │
│ ──────────┼────────────────┼──────────│
│ XYZ Farm  │ Rural Road,    │ [View]   │
│           │ Cornwall       │          │
│                                         │
│ [Pagination]                            │
│ Previous  1  2  3  Next                 │
│                                         │
└─────────────────────────────────────────┘
```

### Data Captured

**Search filters (all optional):**

- `name` (string, max 255)
- `address` (string, max 255)
- `postcode` (string, max 10) - UK postcode
- `approvalNumber` (string, max 255)
- `page` (number) - Current page

**Action:**

- `view-id` (string) - Economic operator ID to view

### GOV.UK Components

- `govuk-back-link`
- `govuk-heading-l`
- `govuk-link` (Add new)
- `govuk-input` (search fields)
- `govuk-button` (Search)
- `govuk-table` (results)
- `govuk-pagination`

### Validation Rules

```javascript
{
  name: Joi.string().max(255).optional().allow(''),
  address: Joi.string().max(255).optional().allow(''),
  postcode: Joi.string().max(10).optional().allow('').messages({
    'string.max': 'Postcode must be 10 characters or fewer'
  }),
  approvalNumber: Joi.string().max(255).optional().allow(''),
  page: Joi.number().integer().min(1).optional()
}
```

### Search Behavior

**API Call:**

- `masterTypes`: ['consignee']
- UK addresses only for live animals (country filter: 'GB')
- 20 results per page

### Error Messages

- **Postcode too long:** "Postcode must be 10 characters or fewer"

### Links

- **Add new:** `/protected/notifications/{referenceNumber}/traders/consignee/new`
- **View:** `/protected/notifications/{referenceNumber}/consignee/view/{economicOperatorId}`

### Next Page

After selection: `/protected/notifications/{referenceNumber}/consignee/confirmation/{economicOperatorId}`

---

## Screen 4d: Create New Consignee

**Route**: `GET/POST /protected/notifications/{referenceNumber}/traders/consignee/new`

### Page Structure

Identical to "Create New Consignor" (Screen 4b) with:

- Title: "Add a new consignee"
- Default country: 'GB' (United Kingdom)
- Postcode is required

### Data Captured

Same as Screen 4b (Create New Consignor)

### Validation Rules

Same as Screen 4b, with postcode always required since consignee must be UK-based for live animals

### Next Page

After creation: `/protected/notifications/{referenceNumber}/consignee/confirmation/{economicOperatorId}?fromCreate=true`

---

## Screen 4e: Search for Importer

**Route**: `GET/POST /protected/notifications/{referenceNumber}/traders/importer/search`

### Page Structure

Identical to "Search for Consignee" (Screen 4c) with:

- Title: "Search for an existing importer"
- Link text: "Add a new importer"

### Search Behavior

Same as consignee search (UK addresses only)

### Links

- **Add new:** `/protected/notifications/{referenceNumber}/traders/importer/new`
- **View:** `/protected/notifications/{referenceNumber}/importer/view/{economicOperatorId}`

### Next Page

After selection: `/protected/notifications/{referenceNumber}/importer/confirmation/{economicOperatorId}`

---

## Screen 4f: Create New Importer

**Route**: `GET/POST /protected/notifications/{referenceNumber}/traders/importer/new`

### Page Structure

Identical to "Create New Consignee" (Screen 4d) with:

- Title: "Add a new importer"

### Next Page

After creation: `/protected/notifications/{referenceNumber}/importer/confirmation/{economicOperatorId}?fromCreate=true`

---

## Screen 4g: Traders Overview

**Route**: `GET/POST /protected/notifications/{referenceNumber}/traders`

### Page Structure

```
┌─────────────────────────────────────────┐
│ GOV.UK Header                           │
│ Import live animals notification       │
├─────────────────────────────────────────┤
│                                         │
│ [Back link] Back                        │
│                                         │
│ [H1] Addresses                          │
│                                         │
│ [Summary list]                          │
│                                         │
│ Place of origin                         │
│ Smith Farm                              │
│ 123 Farm Lane                           │
│ Devon                                   │
│ United Kingdom                          │
│                         [Change]        │
│                                         │
│ Consignee                               │
│ ABC Ltd                                 │
│ 789 Business Park                       │
│ Leeds                                   │
│ United Kingdom                          │
│                         [Change]        │
│                                         │
│ Importer                                │
│ [Link] Add importer                     │
│ [Link] Same as consignee                │
│                                         │
│ [Button] Save and continue              │
│                                         │
└─────────────────────────────────────────┘
```

### Data Displayed

Shows currently added traders:

- **Place of origin** (Consignor) - Required
- **Consignee** - Required
- **Importer** - Required (can be same as consignee)

For each populated trader:

- Company name
- Full address
- "Change" link

For missing traders:

- "Add [trader type]" link
- "Same as consignee" shortcut link (for importer only)

### GOV.UK Components

- `govuk-back-link`
- `govuk-heading-l`
- `govuk-summary-list`
- `govuk-summary-list__key` (trader type labels)
- `govuk-summary-list__value` (address details)
- `govuk-summary-list__actions` (Change links)
- `govuk-link` (Add links, Same as links)
- `govuk-button`

### POST Actions

- `populate_importer` - Copies consignee data to importer role
- `continue` - Proceeds to next page

### Validation

On continue, checks:

- Place of origin (consignor) is populated
- Consignee is populated
- Importer is populated

### Error Messages

If any required trader is missing:

- **Error summary:** "You must add all required addresses"
- **Inline error:** "Add a [trader type]" appears where trader is missing

### Links

- **Add place of origin:** `/protected/notifications/{referenceNumber}/traders/consignor/search`
- **Change place of origin:** `/protected/notifications/{referenceNumber}/traders/consignor/search`
- **Add consignee:** `/protected/notifications/{referenceNumber}/traders/consignee/search`
- **Change consignee:** `/protected/notifications/{referenceNumber}/traders/consignee/search`
- **Add importer:** `/protected/notifications/{referenceNumber}/traders/importer/search`
- **Change importer:** `/protected/notifications/{referenceNumber}/traders/importer/search`

### Next Page

After all required traders added: `/protected/notifications/{referenceNumber}/review`

---

## Screen 5: Review

**Route**: `GET/POST /protected/notifications/{referenceNumber}/review`

### Page Structure

```
┌─────────────────────────────────────────┐
│ GOV.UK Header                           │
│ Import live animals notification       │
├─────────────────────────────────────────┤
│                                         │
│ [Back link] Back                        │
│                                         │
│ [H1] Review                             │
│                                         │
│ [Error summary - if validation errors]  │
│ There is a problem                      │
│ • [Link to error] Description           │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ [H2] Notification details               │
│                                         │
│ [Summary list]                          │
│ Reference       DRAFT.GB.2025.1234567   │
│ Type            CHED-A                  │
│ Status          In progress             │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ [H2] Consignment                        │
│                                         │
│ [Summary list]                          │
│ Country of      France                  │
│ origin                          [Change]│
│                                         │
│ Purpose         For import into GB or NI│
│                                 [Change]│
│                                         │
│ What for        Slaughter               │
│                                 [Change]│
│                                         │
│ Border control  Ashford (Dover)         │
│ post            GBAPHA1A                │
│                                 [Change]│
│                                         │
│ Estimated       15 November 2025        │
│ arrival date    14:30                   │
│                                 [Change]│
│                                         │
│ Gross weight    500 kg                  │
│                                 [Change]│
│                                         │
│ Temperature     Ambient                 │
│                                 [Change]│
│                                         │
│ Container       Yes                     │
│                                 [Change]│
│                                         │
│ Container       CONT123456              │
│ number                          [Change]│
│                                         │
│ Seal number     SEAL789012              │
│                                 [Change]│
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ [H2] Animals                            │
│                                         │
│ [Summary list]                          │
│ Species         Cattle (Bos taurus)     │
│                                 [Change]│
│                                         │
│ Number of       12                      │
│ animals                         [Change]│
│                                         │
│ Commodity code  0102                    │
│                                 [Change]│
│                                         │
│ Net weight      450 kg                  │
│                                 [Change]│
│                                         │
│ Certified as    Slaughter               │
│                                 [Change]│
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ [H2] Documents                          │
│                                         │
│ [Summary list]                          │
│ Health          Document123.pdf         │
│ certificate     Uploaded 10/11/2025     │
│                                 [Change]│
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ [H2] Addresses                          │
│                                         │
│ [Summary list]                          │
│ Place of origin Smith Farm              │
│                 123 Farm Lane           │
│                 Devon, France           │
│                                 [Change]│
│                                         │
│ Consignee       ABC Ltd                 │
│                 789 Business Park       │
│                 Leeds, UK               │
│                                 [Change]│
│                                         │
│ Importer        ABC Ltd                 │
│                 789 Business Park       │
│                 Leeds, UK               │
│                                 [Change]│
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ [H2] Transport                          │
│                                         │
│ [Summary list]                          │
│ Means of        Road vehicle            │
│ transport                       [Change]│
│                                         │
│ Vehicle         GB12 ABC                │
│ registration                    [Change]│
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ [H2] Nominated contact                  │
│                                         │
│ [Summary list]                          │
│ Name            John Smith              │
│                                 [Change]│
│                                         │
│ Email           john.smith@example.com  │
│                                 [Change]│
│                                         │
│ Telephone       01234 567890            │
│                                 [Change]│
│                                         │
│ [Button] Continue to declaration        │
│                                         │
└─────────────────────────────────────────┘
```

### Data Displayed

**Section 1: Notification details**

- Reference number (auto-generated)
- Type (CHED-A)
- Status (Draft, In progress, Submitted, etc.)

**Section 2: Consignment**

- Country/region of origin
- Purpose of import
- What animals are for (if internal market)
- Border control post (BCP)
- Estimated arrival date and time
- Gross weight (if provided)
- Temperature (if provided)
- Container information (if in container)
- Container number, seal number, official seal flag

**Section 3: Animals**

- Species name (common and scientific)
- Number of animals
- Commodity code
- Net weight
- Certified as (breeding/production/slaughter)
- Including unweaned animals flag

**Section 4: Documents**

- Health certificate filename
- Upload date
- Document reference number (if available)

**Section 5: Addresses**

- Place of origin (consignor) - full address
- Consignee - full address
- Importer - full address

**Section 6: Transport**

- Means of transport (road/rail/air/sea)
- Transport identifier (registration, flight number, etc.)
- Transporter details (if required)

**Section 7: Nominated contact**

- Contact name
- Email address
- Telephone number

### GOV.UK Components

- `govuk-back-link`
- `govuk-heading-l` (page title)
- `govuk-heading-m` (section headings)
- `govuk-summary-list` (all data sections)
- `govuk-summary-list__key` (field labels)
- `govuk-summary-list__value` (field values)
- `govuk-summary-list__actions` (Change links)
- `govuk-error-summary` (validation errors)
- `govuk-button` (Continue button)

### Validation Checks

Comprehensive validation performed on continue:

**Required fields:**

- Country of origin
- Purpose
- Border control post
- Estimated arrival date and time
- Place of origin (consignor) address
- Consignee address
- Importer address
- At least one commodity/animal
- Health certificate uploaded
- Means of transport
- Nominated contact details

**Business rules:**

- Estimated arrival date must be in the future
- Net weight must be less than or equal to gross weight
- BCP must be appropriate for means of transport
- All trader addresses must be complete

### Error Display

**Error Summary (top of page):**

```
┌─────────────────────────────────────────┐
│ [Error summary box - red border]        │
│                                         │
│ There is a problem                      │
│                                         │
│ • Border control post is required       │
│ • Estimated arrival date must be in     │
│   the future                            │
│ • Upload a health certificate           │
│                                         │
└─────────────────────────────────────────┘
```

**Inline Errors (next to sections):**

- Red error icon next to section heading
- Error message appears in summary list value
- Change link highlighted in red

### Error Messages

- **No BCP:** "Select a border control post"
- **Arrival date in past:** "Estimated arrival date must be in the future"
- **No health certificate:** "Upload a health certificate"
- **No consignor:** "Add place of origin address"
- **No consignee:** "Add consignee address"
- **No importer:** "Add importer address"
- **No commodity:** "Add at least one animal or commodity"
- **No transport:** "Add means of transport"
- **No contact:** "Add nominated contact details"

### Change Links

Each "Change" link redirects to the relevant page:

- **Origin:** `/protected/notifications/{referenceNumber}/consignment-origin`
- **Purpose:** `/protected/notifications/{referenceNumber}/consignment/page-5`
- **Consignment details:** `/protected/notifications/{referenceNumber}/consignment/details`
- **Animals/Commodities:** `/protected/notifications/{referenceNumber}/commodity/details`
- **Documents:** `/protected/notifications/{referenceNumber}/documents/page-1`
- **Addresses:** `/protected/notifications/{referenceNumber}/traders`
- **Transport:** `/protected/notifications/{referenceNumber}/transport/before-bip`
- **Contact:** `/protected/notifications/{referenceNumber}/nominated-contact`

All change links include query parameter: `?fromImporterReview=true` to return to review page after edit

### Next Page

If validation passes: `/protected/notifications/{referenceNumber}/declaration`

---

## Screen 6: Confirmation

**Route**: `GET /protected/notifications/{referenceNumber}/confirmation`

### Page Structure

```
┌─────────────────────────────────────────┐
│ GOV.UK Header                           │
│ Import live animals notification       │
├─────────────────────────────────────────┤
│                                         │
│ [GOV.UK Panel - Green background]      │
│                                         │
│    Notification submitted               │
│                                         │
│    Your reference number                │
│    CVEDA.GB.2025.1234567                │
│                                         │
│                                         │
│ [H2] What happens next                  │
│                                         │
│ Your notification has been submitted.   │
│                                         │
│ The animals will be inspected at:       │
│                                         │
│ [Inset text]                            │
│ Ashford Border Control Post             │
│ Sevington Inland Border Facility        │
│ Ashford, Kent                           │
│ TN24 0GB                                │
│                                         │
│ [Warning text]                          │
│ ! The animals must not be moved until   │
│   they have been inspected and cleared. │
│                                         │
│ You will be contacted about:            │
│ • Documentary checks                    │
│ • Identity checks                       │
│ • Physical inspection scheduling        │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ [H2] What you can do next               │
│                                         │
│ [Link] View your notification           │
│ [Link] Print your notification          │
│ [Link] Create another notification      │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ [H2] Help us improve this service       │
│                                         │
│ [Link] Take our survey (opens in new    │
│        window)                          │
│                                         │
└─────────────────────────────────────────┘
```

### Data Displayed

**Confirmation Panel:**

- "Notification submitted" heading
- Full CHED reference number (format: `CVEDA.GB.YYYY.NNNNNNN`)
- Green background for success

**What Happens Next:**

- Confirmation that notification is submitted
- Inspection requirement notice
- Border Control Post details where inspection will occur:
  - BCP name
  - Full address
  - Postcode
- Warning about not moving animals before clearance
- List of what the importer will be contacted about

**Actions Available:**

- View the submitted notification
- Print the notification (PDF)
- Create another notification
- Feedback survey link

### GOV.UK Components

- `govuk-panel` (green confirmation panel)
- `govuk-panel__title` (Notification submitted)
- `govuk-panel__body` (Reference number)
- `govuk-heading-m` (section headings)
- `govuk-inset-text` (BCP address)
- `govuk-warning-text` (do not move animals notice)
- `govuk-body` (descriptive paragraphs)
- `govuk-list--bullet` (list of contact topics)
- `govuk-link` (all action links)

### CHED Reference Format

```
CVEDA.GB.YYYY.NNNNNNN
│     │  │    └─ 7-digit sequential number
│     │  └────── Year (4 digits)
│     └───────── Country code (GB)
└─────────────── CHED type (CVEDA for live animals)
```

### Inspection Information

**For CHED-A (Live Animals):**

- Inspection is **always required**
- Shows control point details from `partOne.pointOfEntry` (BCP code)
- Fetches BCP details from BIP microservice

**Inspection Types Listed:**

1. **Documentary checks** - Health certificate verification
2. **Identity checks** - Animal identification verification
3. **Physical inspection** - Veterinary examination of animals

### Conditional Logic

**Inspection Required (CHED-A):**
Always shows inspection information section with BCP details

**Warning Text:**
Always displays for live animals (cannot be moved until cleared)

### Links

- **View notification:** `/protected/notifications/{referenceNumber}/overview`
- **Print notification:** `/protected/notifications/{referenceNumber}/certificate/pdf`
- **Create another:** `/protected/notifications/consignment-origin` (new notification)
- **Survey:** External URL with query parameters:
  - `link_location=notification`
  - `ched=CVEDA`

### Page Behavior

- **Read-only page** (no form submission)
- Notification status is now "Submitted"
- Can only be accessed after successful submission
- Attempting to edit will show "cannot amend submitted notification" message

### Next Steps for User

1. Note the reference number
2. Prepare for BCP inspection
3. Ensure animals arrive at specified BCP
4. Wait for contact from inspection team
5. Do not move animals until cleared

---

## Data Flow Summary

### Complete Journey Data Structure

When the notification is completed, the following data structure is saved:

```javascript
{
  // Basic notification info
  type: 'CVEDA',
  referenceNumber: 'CVEDA.GB.2025.1234567',
  status: 'SUBMITTED',

  // Part One - Main consignment details
  partOne: {
    // Origin
    commodities: {
      countryOfOrigin: 'FR',              // From Screen 1
      consignedCountry: 'GB',
      regionOfOrigin: null,               // Or 'GB-ENG', etc.
      temperature: 'ambient',             // From Screen 3
      animalsCertifiedAs: 'slaughter',    // From Screen 3
      includesNonAblactedAnimals: false,  // From Screen 3
      totalGrossWeight: 500,
      totalGrossWeightUnit: 'kilograms',

      // Single commodity entry (simplified)
      commodityComplement: [{
        speciesName: 'Cattle',
        speciesTypeName: 'Bos taurus',
        commodityCode: '0102',
        numberOfAnimals: 12,
        netWeight: 450
      }]
    },

    // Purpose - From Screen 2
    purpose: {
      purposeGroup: 'internalmarket',     // or 'transit', 'tranship', etc.
      forImportOrAdmission: 'slaughter',  // internal market specific

      // Transit specific (if applicable)
      thirdCountryTranshipment: 'US',
      exitBCP: 'GBDOV1',
      exitDate: '2025-11-20T14:30:00Z',
      transitThirdCountries: ['NL', 'BE']
    },

    // Consignment check - From Screen 3
    consignmentCheck: {
      sealContainersSealsNumbers: [{
        containerNumber: 'CONT123456',
        sealNumber: 'SEAL789012',
        isOfficial: false
      }]
    },

    // Point of entry
    pointOfEntry: 'GBAPHA1A',
    estimatedArrivalDate: '2025-11-15T14:30:00Z',

    // Traders - From Screens 4a-4g
    consignor: {
      id: 'consignor-uuid',
      companyName: 'Smith Farm',
      address: {
        addressLine1: '123 Farm Lane',
        city: 'Devon',
        country: 'FR',
        postalCode: '12345'
      }
    },

    consignee: {
      id: 'consignee-uuid',
      companyName: 'ABC Ltd',
      address: {
        addressLine1: '789 Business Park',
        city: 'Leeds',
        country: 'GB',
        postalCode: 'LS1 2AB'
      }
    },

    importer: {
      id: 'importer-uuid',
      // Same structure as consignee
    },

    // Transport
    meansOfTransport: 'road',
    meansOfTransportFromEntryPoint: {
      type: 'road',
      id: 'GB12ABC'
    },

    // Nominated contact
    personResponsible: {
      name: 'John Smith',
      email: 'john.smith@example.com',
      telephone: '01234567890'
    }
  },

  // Documents
  partTwo: {
    // Health certificate uploaded
    // (document details stored separately)
  },

  // Submission metadata
  submittedDate: '2025-11-12T10:30:00Z',
  submittedBy: 'user-uuid'
}
```

---

## Implementation Notes for Prototype

### Session Management

**Cookie-based session storage:**

- Use Hapi's `server.state()` to configure session cookie
- Store notification data in progress
- Cookie options:
  ```javascript
  {
    ttl: null,              // Session cookie
    isHttpOnly: true,
    isSameSite: 'Strict',
    encoding: 'iron',       // Encrypted
    password: '<32-char-key>'
  }
  ```

### Form Validation Pattern

**Consistent validation approach:**

1. Define Joi schema for each page
2. Validate on POST
3. If errors: Re-render page with error messages
4. If valid: Save to session, redirect to next page

**Example handler structure:**

```javascript
// GET handler
async function getHandler(request, h) {
  const notification = request.state.notification || {}
  const viewContext = {
    ...notification.pageData,
    errors: {}
  }
  return h.view('page-template', viewContext)
}

// POST handler
async function postHandler(request, h) {
  const schema = Joi.object({
    /* validation */
  })
  const { error, value } = schema.validate(request.payload, {
    abortEarly: false
  })

  if (error) {
    return h
      .view('page-template', {
        ...request.payload,
        errors: formatErrors(error)
      })
      .code(400)
  }

  // Save to session
  const notification = request.state.notification || {}
  notification.pageData = value

  return h.redirect('/next-page').state('notification', notification)
}
```

### Error Formatting

**Convert Joi errors to GOV.UK format:**

```javascript
function formatErrors(joiError) {
  const errors = {}
  const errorList = []

  for (const detail of joiError.details) {
    const field = detail.path[0]
    errors[field] = {
      text: detail.message
    }
    errorList.push({
      text: detail.message,
      href: `#${field}`
    })
  }

  return { errors, errorList }
}
```

### Change Link Handling

**Return to review after edit:**

- Add `?fromImporterReview=true` to all change links
- Check query param in handlers
- If present, redirect back to `/review` after save
- Otherwise, follow normal page flow

### Next Page Routing

**Simple routing for MVP:**

```javascript
const NEXT_PAGES = {
  'consignment-origin': '/consignment/page-5',
  'page-5': '/consignment/details',
  'consignment/details': '/traders',
  traders: '/review',
  review: '/declaration',
  declaration: '/confirmation'
}
```

### Trader Search Simplification

**For MVP prototype:**

- Pre-populate search results with dummy data
- No need for actual API calls
- 3-5 example traders for each type
- Allow manual entry via "Add new" form

### Document Upload Simplification

**For MVP:**

- Accept any PDF file
- Store filename only (no actual upload)
- Display filename in review

### Reference Number Generation

**Simple format for prototype:**

```javascript
function generateReference() {
  const year = new Date().getFullYear()
  const random = Math.floor(1000000 + Math.random() * 9000000)
  return `CVEDA.GB.${year}.${random}`
}
```

---

## Summary

This specification documents 10 key pages in the CHED-A (live animals) import notification journey:

1. **Origin** - Country/region selection
2. **Purpose** - Main reason for importing with conditional fields
3. **Details** - Animal-specific details and container information
4. **Consignor Search** - Find or create place of origin
5. **Consignor Create** - Add new place of origin
6. **Consignee Search** - Find or create consignee
7. **Consignee Create** - Add new consignee
8. **Importer Search** - Find or create importer
9. **Importer Create** - Add new importer
10. **Traders Overview** - Summary of all addresses
11. **Review** - Complete summary with validation
12. **Confirmation** - Submission success and next steps

All pages use GOV.UK Design System components and follow government service standards for forms, validation, and user experience.
