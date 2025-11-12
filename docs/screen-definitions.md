# Screen Definitions

## Screen : Review & Submit

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

## Screen : Confirmation

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
