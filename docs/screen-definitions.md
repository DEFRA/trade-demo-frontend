# Screen Definitions

## Screen 1: Commodity & Animals

**Route**: `GET/POST /import/commodity`

### Page Structure

```
┌─────────────────────────────────────────┐
│ GOV.UK Header                           │
│ Import live animals notification       │
├─────────────────────────────────────────┤
│                                         │
│ [H1] What animals are you importing?    │
│                                         │
│ [Inset text]                            │
│ You're importing live cattle            │
│ (Bos taurus) from France                │
│                                         │
│ Commodity code: 0102                    │
│ Country of origin: France (FR)          │
│                                         │
│ [Form]                                  │
│                                         │
│ Number of animals                       │
│ [Text input - numeric]                  │
│ For example: 12                         │
│                                         │
│ How will the animals be certified?     │
│ [Radio buttons]                         │
│ ○ Breeding                              │
│ ○ Production                            │
│ ○ Slaughter                             │
│                                         │
│ [Button] Continue                       │
│                                         │
└─────────────────────────────────────────┘
```

### Data Captured

- `consignment.animals.numberOfAnimals` (user input)
- `consignment.animals.certificationPurpose` (user selection)

### Hardcoded/Displayed

- Species: Bos taurus (Cattle)
- Commodity code: 0102
- Country of origin: FR

### GOV.UK Components

- `govuk-inset-text` (commodity info)
- `govuk-input` (number of animals)
- `govuk-radios` (certification purpose)
- `govuk-button` (continue)

### Validation Rules

Validation schema from `src/server/import/validators/schemas.js`:

```javascript
export const commoditySchema = Joi.object({
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
      'any.required': 'Select how the animals will be certified',
      'string.empty': 'Select how the animals will be certified'
    })
})
```

---

## Screen 2: Transport

**Route**: `GET/POST /import/transport`

### Page Structure

```
┌─────────────────────────────────────────┐
│ GOV.UK Header                           │
│ Import live animals notification       │
├─────────────────────────────────────────┤
│                                         │
│ [Back link] Back                        │
│                                         │
│ [H1] How will the animals arrive?       │
│                                         │
│ [Form]                                  │
│                                         │
│ Transport mode                          │
│ [Radio buttons]                         │
│ ○ Plane (Flight BA123)                  │
│ ○ Ship (Vessel MV OCEANIA)              │
│ ○ Train (Service FR9045)                │
│ ○ Road vehicle (Truck GB12ABC)          │
│                                         │
│ Journey duration (hours)                │
│ [Text input - numeric]                  │
│ Estimated journey time from departure   │
│ to arrival in the UK                    │
│                                         │
│ [Button] Continue                       │
│                                         │
└─────────────────────────────────────────┘
```

### Data Captured

- `movement.transport.mode` (AIR/SEA/RAIL/ROAD) - user selection
- `movement.timing.journeyDurationMinutes` (converted from hours) - user input

### Hardcoded/Auto-populated from Config

- `movement.transport.identifier` - pulled from config based on mode:
  - AIR → "BA123"
  - SEA → "MV OCEANIA"
  - RAIL → "FR9045"
  - ROAD → "GB12ABC"

### GOV.UK Components

- `govuk-back-link`
- `govuk-radios` (transport mode with identifiers shown in labels)
- `govuk-input` (journey duration)
- `govuk-button` (continue)

### Validation Rules

Validation schema from `src/server/import/validators/schemas.js`:

```javascript
export const transportSchema = Joi.object({
  transportMode: Joi.string()
    .valid('AIR', 'SEA', 'RAIL', 'ROAD')
    .required()
    .messages({
      'any.only': 'Select how the animals will arrive',
      'any.required': 'Select how the animals will arrive',
      'string.empty': 'Select how the animals will arrive'
    }),

  journeyDurationHours: Joi.number()
    .integer()
    .min(1)
    .max(168)
    .required()
    .messages({
      'number.base': 'Enter the journey duration in hours',
      'number.min': 'Journey duration must be at least 1 hour',
      'number.max': 'Journey duration cannot exceed 168 hours (7 days)',
      'any.required': 'Enter the journey duration in hours'
    })
})
```

---

## Screen 3: Arrival

**Route**: `GET/POST /import/arrival`

### Page Structure

```
┌─────────────────────────────────────────┐
│ GOV.UK Header                           │
│ Import live animals notification       │
├─────────────────────────────────────────┤
│                                         │
│ [Back link] Back                        │
│                                         │
│ [H1] When and where will the animals    │
│      arrive?                            │
│                                         │
│ [Form]                                  │
│                                         │
│ Border control post                     │
│ [Select dropdown]                       │
│ Select BCP                              │
│ Ashford (Dover) - GBAPHA1A              │
│ Heathrow - GBHEA1                       │
│                                         │
│ Arrival date                            │
│ [Date input - 3 fields]                 │
│ Day [__] Month [__] Year [____]         │
│ For example: 12 11 2025                 │
│                                         │
│ Arrival time                            │
│ [Text input with pattern]               │
│ For example: 22:00                      │
│                                         │
│ [Button] Continue                       │
│                                         │
└─────────────────────────────────────────┘
```

### Data Captured

- `movement.borderControlPost.code` (BCP code)
- `movement.timing.estimatedArrival.date` (ISO date)
- `movement.timing.estimatedArrival.time` (HH:mm)

### GOV.UK Components

- `govuk-back-link`
- `govuk-select` (BCP dropdown)
- `govuk-date-input` (arrival date)
- `govuk-input` (arrival time with pattern and hint)
- `govuk-button` (continue)

### Validation Rules

Validation schema from `src/server/import/validators/schemas.js`:

```javascript
export const arrivalSchema = Joi.object({
  bcpCode: Joi.string().valid('GBAPHA1A', 'GBHEA1').required().messages({
    'any.only': 'Select a border control post',
    'any.required': 'Select a border control post',
    'string.empty': 'Select a border control post'
  }),

  arrivalDate: Joi.date().iso().min('now').required().messages({
    'date.base': 'Enter the arrival date',
    'date.min': 'Arrival date must be in the future',
    'any.required': 'Enter the arrival date'
  }),

  arrivalTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .required()
    .messages({
      'string.pattern.base': 'Enter a valid time in 24-hour format, like 14:30',
      'any.required': 'Enter the arrival time',
      'string.empty': 'Enter the arrival time'
    })
})
```

### Date Field Handling

GOV.UK date input uses 3 separate form fields, but session stores ISO date string:

**Form submission** (controller receives `arrivalDate-day`, `arrivalDate-month`, `arrivalDate-year`):

```javascript
// src/server/import/controllers/arrival.js
const combineDateFields = (day, month, year) => {
  if (!day || !month || !year) return null
  const paddedDay = day.toString().padStart(2, '0')
  const paddedMonth = month.toString().padStart(2, '0')
  return `${year}-${paddedMonth}-${paddedDay}` // Returns: '2025-11-15'
}

const arrivalDate = combineDateFields(day, month, year)
```

**Template rendering** (split ISO date for GOV.UK component in view model):

```javascript
// src/server/import/helpers/view-models.js
let day = '',
  month = '',
  year = ''
if (pageModel.arrivalDate) {
  const [y, m, d] = pageModel.arrivalDate.split('-')
  year = y
  month = m
  day = d
}
// Pass to template as dateItems array for GOV.UK date input
```

---

## Screen 4: Parties (Consignor + Consignee)

**Route**: `GET/POST /import/parties`

### Page Structure

```
┌─────────────────────────────────────────┐
│ GOV.UK Header                           │
│ Import live animals notification       │
├─────────────────────────────────────────┤
│                                         │
│ [Back link] Back                        │
│                                         │
│ [H1] Who is sending and receiving the   │
│      animals?                           │
│                                         │
│ [Form]                                  │
│                                         │
│ Select the consignor                    │
│ [Radio buttons with hints]              │
│ ○ Astra Rosales                         │
│   43 East Hague Extension, Quas         │
│   occaecat ut ear, 30055, Switzerland   │
│                                         │
│ ○ Pierre Dubois                         │
│   Address details...                    │
│                                         │
│ Select the consignee                    │
│ [Radio buttons with hints]              │
│ ○ Linus George Ltd                      │
│   558 Oak Street, Eligendi et beatae p, │
│   24271, United Kingdom                 │
│                                         │
│ ○ Smith Farms Ltd                       │
│   Address details...                    │
│                                         │
│ [Button] Continue                       │
│                                         │
└─────────────────────────────────────────┘
```

### Data Captured

- `parties.consignor.id` (selected consignor ID, maps to config object)
- `parties.consignee.id` (selected consignee ID, maps to config object)

### GOV.UK Components

- `govuk-back-link`
- `govuk-radios` (consignor options with address hints)
- `govuk-radios` (consignee options with address hints)
- `govuk-button` (continue)

### Validation Rules

Validation schema from `src/server/import/validators/schemas.js`:

```javascript
export const partiesSchema = Joi.object({
  consignorId: Joi.string().uuid().required().messages({
    'string.guid': 'Select a consignor',
    'any.required': 'Select a consignor',
    'string.empty': 'Select a consignor'
  }),

  consigneeId: Joi.string().uuid().required().messages({
    'string.guid': 'Select a consignee',
    'any.required': 'Select a consignee',
    'string.empty': 'Select a consignee'
  })
})
```

---

## Screen 5: Review & Submit

**Route**: `GET /import/review`, `POST /import/review`

### Page Structure

```
┌─────────────────────────────────────────┐
│ GOV.UK Header                           │
│ Import live animals notification       │
├─────────────────────────────────────────┤
│                                         │
│ [Back link] Back                        │
│                                         │
│ [H1] Check your answers before          │
│      submitting                         │
│                                         │
│ [Summary list]                          │
│                                         │
│ Animals                                 │
│ Species        Bos taurus (Cattle)      │
│                                 [Change]│
│ Commodity      0102 Live bovine animals │
│                                 [Change]│
│ Number         12                       │
│                                 [Change]│
│ Certified as   Breeding                 │
│                                 [Change]│
│                                         │
│ Transport                               │
│ Mode           Plane                    │
│                                 [Change]│
│ Flight number  BA123                    │
│                                 [Change]│
│ Journey time   5 hours                  │
│                                 [Change]│
│                                         │
│ Arrival                                 │
│ BCP            Ashford (Dover)          │
│                GBAPHA1A                 │
│                                 [Change]│
│ Date           12 November 2025         │
│                                 [Change]│
│ Time           22:00                    │
│                                 [Change]│
│                                         │
│ Origin                                  │
│ Consignor      Astra Rosales            │
│                Switzerland              │
│                                 [Change]│
│                                         │
│ Destination                             │
│ Consignee      Linus George Ltd         │
│                United Kingdom           │
│                                 [Change]│
│ CPH number     12/345/6789              │
│                                 [Change]│
│                                         │
│ [Form - POST to /import/submit]         │
│                                         │
│ [Checkbox]                              │
│ ☐ I confirm the information is correct  │
│                                         │
│ [Button - Primary] Submit notification  │
│ [Button - Secondary] Save as draft      │
│                                         │
└─────────────────────────────────────────┘
```

### Data Displayed

- All captured data from previous screens
- Change links navigate back to respective screen

### GOV.UK Components

- `govuk-back-link`
- `govuk-summary-list` (with change links)
- `govuk-checkboxes` (confirmation checkbox)
- `govuk-button` (primary: submit, secondary: save draft)

### Actions

- **Submit**: Validates confirmation checkbox, transforms to CHED, POST to IPAFFS
- **Save as draft**: Saves journey state with status: "DRAFT"

### Validation Rules

Validation schema from `src/server/import/validators/schemas.js`:

```javascript
export const reviewSchema = Joi.object({
  confirmAccurate: Joi.boolean().valid(true).required().messages({
    'any.only':
      'Confirm that the information you have provided is correct to the best of your knowledge',
    'any.required':
      'Confirm that the information you have provided is correct to the best of your knowledge'
  })
})
```

### CHED Reference Generation

On successful submission, a CHED reference is generated (stub implementation for prototype):

```javascript
// src/server/import/controllers/review.js
const generateChedReference = () => {
  const year = new Date().getFullYear()
  const randomNumber = Math.floor(1000000 + Math.random() * 9000000)
  return `CHEDP.GB.${year}.${randomNumber}`
}
// Returns: 'CHEDP.GB.2025.1234567' (7-digit random number)
```

**Note**: In production, the CHED reference would be returned from the IPAFFS API after successful submission.

---

## Screen 6: Confirmation

**Route**: `GET /import/confirmation`

### Page Structure

```
┌─────────────────────────────────────────┐
│ GOV.UK Header                           │
│ Import live animals notification       │
├─────────────────────────────────────────┤
│                                         │
│ [GOV.UK Panel - Green]                  │
│ ✓ Import notification submitted         │
│                                         │
│   Your CHED reference:                  │
│   DRAFT.GB.2025.1207486                 │
│                                         │
│                                         │
│ [H2] What happens next                  │
│                                         │
│ Your notification has been sent to the  │
│ Border Control Post.                    │
│                                         │
│ You will receive updates about:         │
│ • Inspection requirements               │
│ • Documentary checks                    │
│ • Physical inspection scheduling        │
│                                         │
│ Keep a note of your CHED reference:     │
│ DRAFT.GB.2025.1207486                   │
│                                         │
│ [Button] View notification (if avail.)  │
│ [Link] Submit another notification      │
│                                         │
└─────────────────────────────────────────┘
```

### Data Displayed

- `chedReference` (from IPAFFS response)
- Submission timestamp

### GOV.UK Components

- `govuk-panel` (success confirmation)
- `govuk-button` (optional: view in IPAFFS)
- Link to start new notification

### No Form

This is a read-only confirmation page

---
