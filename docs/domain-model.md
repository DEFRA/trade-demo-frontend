# Live Animal Import Journey - Domain Model & Strategy

## 1. Three Data Representations

This application uses **three distinct data models** for different purposes:

### 1.1 Page Model (Session Storage - Implementation)

**Location**: Redis session (via `@hapi/yar`), key: `pageModel`
**Structure**: Flat key-value object
**Purpose**: Stores user form input during journey
**Scope**: Current implementation (prototype)

Example:

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

**Why flat?** Simpler session management - no deep object merging, direct form field → session key mapping.

### 1.2 Journey Model (Domain Model - Transformation Target)

**Location**: Backend transformation logic (future implementation)
**Structure**: Nested business entity structure (documented in this file)
**Purpose**: Represents import domain concepts using ubiquitous language
**Scope**: Backend transformation target for IPAFFS submission

Example:

```javascript
{
  consignment: {
    animals: {
      numberOfAnimals: 12,
      species: { scientificName: 'Bos taurus', commonName: 'Cattle' }
    },
    certificationPurpose: 'Breeding'
  },
  movement: {
    transport: { mode: 'AIR', identifier: 'BA123' },
    timing: { journeyDurationMinutes: 300 }
  }
}
```

**Why nested?** Reflects business domain structure, enforces invariants, aligns with DDD principles.

### 1.3 CHED Model (IPAFFS Technical Format)

**Location**: Final submission payload to IPAFFS API
**Structure**: IPAFFS-specific JSON (CHED-P schema)
**Purpose**: Technical interchange format with IPAFFS system
**Scope**: Generated from Journey Model during submission

**Transformation Flow**:

```
User Input → Page Model (flat) → Journey Model (nested) → CHED Model (IPAFFS API)
            [Session]              [Backend Transform]      [API Payload]
```

**Prototype Scope**: This prototype implements **Page Model only**. Journey Model transformation and CHED generation are future work.

---

## 2. Journey Domain Model (DDD)

**IMPORTANT**: The nested Journey Model described in this section is the **backend transformation target**, NOT the session structure. The session uses a flat Page Model (see Section 1.1 above and SCREEN_SPECIFICATIONS.md Session Management section).

### 2.1 Domain-Driven Design Approach

The journey model represents the **business domain** of importing live animals, NOT the CHED technical format. It should:

- Use ubiquitous language from the import/export domain
- Be independent of IPAFFS/TRACES implementation details
- Focus on capturing user intent and business rules
- Be simple and testable

### 2.2 Bounded Context: Live Animal Import

**Context Name**: LiveAnimalImportNotification

**Ubiquitous Language**:

- **Consignment**: A shipment of animals being imported
- **Journey**: The physical movement from origin to destination
- **Parties**: Organizations/individuals involved in the import
- **Certification**: The regulatory purpose and compliance requirements
- **Border Control Post (BCP)**: The UK entry point for inspection

### 2.3 Aggregate Root: LiveAnimalImportNotification

```typescript
// Aggregate Root
class LiveAnimalImportNotification {
  id: Id // Value Object
  status: Status // Value Object (Draft, Submitted, etc.)
  createdAt: Date
  updatedAt: Date

  consignment: AnimalConsignment // Entity
  movement: Movement // Entity
  parties: ConsignmentParties // Entity
}
```

### 2.4 Entities

#### AnimalConsignment Entity

Represents the animals being imported and their characteristics.

```typescript
class AnimalConsignment {
  animals: AnimalGroup // Value Object
  countryOfOrigin: CountryCode // Value Object (ISO 3166-1 alpha-2)
  certificationPurpose: CertificationPurpose // Value Object
}

// Value Objects
interface AnimalGroup {
  species: Species // e.g., "Bos taurus" (cattle)
  speciesCommonName: string // e.g., "Cattle"
  commodityCode: CommodityCode // e.g., "0102"
  numberOfAnimals: number
  numberOfPackages: number
}

interface Species {
  scientificName: string // e.g., "Bos taurus"
  commonName: string // e.g., "Domestic cattle"
}

enum CertificationPurpose {
  BREEDING = 'Breeding',
  PRODUCTION = 'Production',
  SLAUGHTER = 'Slaughter',
  OTHER = 'Other'
}
```

#### Movement Entity

Represents the physical movement of animals from origin to UK destination.

```typescript
class Movement {
  origin: Location // Value Object
  destination: Location // Value Object
  borderControlPost: BorderControlPost // Value Object
  transport: TransportDetails // Value Object
  timing: JourneyTiming // Value Object
}

// Value Objects
interface Location {
  address: Address
  country: CountryCode
}

interface Address {
  lines: string[] // Flexible address lines
  city?: string
  postalCode?: string
}

interface BorderControlPost {
  code: string // e.g., "GBAPHA1A"
  name: string // e.g., "Ashford (Dover)"
  portCode: string // e.g., "GBLGW"
  acceptedTransportModes: TransportMode[]
}

interface TransportDetails {
  mode: TransportMode // Enum: AIR, SEA, RAIL, ROAD
  identifier: string // Flight number, vessel name, etc.
  documentReference?: string
  transporterCompany?: string
}

enum TransportMode {
  AIR = 'AIR',
  SEA = 'SEA',
  RAIL = 'RAIL',
  ROAD = 'ROAD'
}

interface JourneyTiming {
  estimatedArrival: DateTime // Date + Time
  estimatedDeparture?: DateTime // Optional
  journeyDurationMinutes: number
}

interface DateTime {
  date: string // ISO date (YYYY-MM-DD)
  time: string // HH:mm
}
```

#### ConsignmentParties Entity

Represents the organizations and people involved in the import.

```typescript
class ConsignmentParties {
  personResponsible: Party // Value Object (logged-in user = submitter)
  consignor: Party // Value Object (origin)
  consignee: Party // Value Object (destination)
  importer?: Party // Optional (if different from consignee)
}

// Value Objects
// Party represents a business entity with optional contact person details
// For personResponsible: contactName is the logged-in user's name (required)
// For consignor/consignee/importer: contactName is optional
interface Party {
  companyName: string
  contactName?: string // Required for personResponsible, optional for others
  address: Address
  email?: string
  phone?: string
}
```

### 2.5 Domain Model - Complete Structure

```typescript
// Root aggregate with all entities
interface LiveAnimalImportNotification {
  // Identity
  id: string
  status: 'DRAFT' | 'SUBMITTED'
  chedReference: 'DRAFT.GB.2025.1207486' // this is to track the journey in the CHED system
  createdAt: Date
  updatedAt: Date

  // Entities
  consignment: {
    animals: {
      species: {
        scientificName: string // "Bos taurus"
        commonName: string // "Cattle"
      }
      commodityCode: string // "0102"
      numberOfAnimals: number
      numberOfPackages: number
    }
    countryOfOrigin: string // "FR"
    certificationPurpose: 'Breeding' | 'Production' | 'Slaughter' | 'Other'
  }

  movement: {
    origin: {
      address: {
        lines: string[]
        city?: string
        postalCode?: string
      }
      country: string
    }
    destination: {
      address: {
        lines: string[]
        city: string
        postalCode: string
      }
      country: string
    }
    borderControlPost: {
      code: string
      name: string
      portCode: string
    }
    transport: {
      mode: 'AIR' | 'SEA' | 'RAIL' | 'ROAD'
      identifier: string
      documentReference?: string
      transporterCompany?: string
    }
    timing: {
      estimatedArrival: {
        date: string
        time: string
      }
      estimatedDeparture?: {
        date: string
        time: string
      }
      journeyDurationMinutes: number
    }
  }

  parties: {
    personResponsible: {
      companyName: string
      contactName: string // Logged-in user's name (required)
      address: {
        lines: string[]
      }
      email?: string
      phone?: string
    }
    consignor: {
      companyName: string
      contactName?: string
      address: {
        lines: string[]
        city?: string
        postalCode?: string
      }
      country: string
      email?: string
      phone?: string
    }
    consignee: {
      companyName: string
      contactName?: string
      address: {
        lines: string[]
        city: string
        postalCode: string
      }
      country: string
      email?: string
      phone?: string
    }
    importer?: {
      companyName: string
      contactName?: string
      address: {
        lines: string[]
        city: string
        postalCode: string
      }
      country: string
      email?: string
      phone?: string
    }
  }
}
```

### 2.6 Domain Rules & Invariants

**Consignment Rules:**

1. Number of animals must be ≥ 1
2. Number of packages must be ≥ 1
3. Country of origin cannot be GB (for imports)
4. Certification purpose is required for all live animal imports

**Journey Rules:**

1. Arrival date must be in the future
2. Journey duration must be > 0 minutes
3. Border control post must accept the selected transport mode
4. Destination must be in GB

**Parties Rules:**

1. Person responsible must be GB-based (logged-in user)
2. Person responsible and submitter are the same legal entity
3. Consignee must be GB-based
4. Consignor must not be GB (for imports from outside GB)
5. If importer not specified, defaults to consignee

---

## 3. Page Model → Journey Model Transformation

**Status**: Future implementation (not in prototype scope)

This section documents the transformation logic that will convert the flat Page Model (session storage) into the nested Journey Model (domain representation) before submitting to the backend API.

### 3.1 Side-by-Side Example

**Page Model (Flat - Session Storage)**:

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

**Journey Model (Nested - Domain Representation)**:

```javascript
{
  id: '550e8400-e29b-41d4-a716-446655440000',
  status: 'DRAFT',
  chedReference: 'DRAFT.GB.2025.1207486',
  createdAt: '2025-11-15T10:30:00Z',
  updatedAt: '2025-11-15T10:45:00Z',

  consignment: {
    animals: {
      species: {
        scientificName: 'Bos taurus',      // ← Looked up from config
        commonName: 'Cattle'                 // ← Looked up from config
      },
      commodityCode: '0102',                 // ← Looked up from config
      numberOfAnimals: 12,                   // ← Direct mapping
      numberOfPackages: 12                   // ← Direct mapping (default = numberOfAnimals)
    },
    countryOfOrigin: 'FR',                   // ← Looked up from config
    certificationPurpose: 'Breeding'         // ← Direct mapping
  },

  movement: {
    origin: {
      address: {
        lines: ['123 Rue de la Ferme'],      // ← Looked up from consignorId
        city: 'Lyon',
        postalCode: '69001'
      },
      country: 'FR'
    },
    destination: {
      address: {
        lines: ['456 Farm Lane'],            // ← Looked up from consigneeId
        city: 'Bristol',
        postalCode: 'BS1 2AB'
      },
      country: 'GB'
    },
    borderControlPost: {
      code: 'GBAPHA1A',                      // ← Direct mapping
      name: 'Ashford (Dover)',               // ← Looked up from bcpCode
      portCode: 'GBLGW'                      // ← Looked up from bcpCode
    },
    transport: {
      mode: 'AIR',                           // ← Direct mapping
      identifier: 'BA123',                   // ← Looked up from config
      documentReference: null,
      transporterCompany: null
    },
    timing: {
      estimatedArrival: {
        date: '2025-11-15',                  // ← Direct mapping
        time: '22:00'                        // ← Direct mapping
      },
      estimatedDeparture: null,
      journeyDurationMinutes: 300            // ← Converted: journeyDurationHours * 60
    }
  },

  parties: {
    personResponsible: {
      companyName: 'ABC Trading Ltd',        // ← From logged-in user context
      contactName: 'John Smith',             // ← From logged-in user context
      address: {
        lines: ['789 Business Park']
      },
      email: 'john.smith@abc-trading.co.uk',
      phone: '+44 20 7123 4567'
    },
    consignor: {
      companyName: 'French Farm Exports',    // ← Looked up from consignorId
      contactName: 'Marie Dubois',
      address: {
        lines: ['123 Rue de la Ferme'],
        city: 'Lyon',
        postalCode: '69001'
      },
      country: 'FR',
      email: 'marie@frenchfarm.fr',
      phone: '+33 4 7890 1234'
    },
    consignee: {
      companyName: 'UK Farm Imports',        // ← Looked up from consigneeId
      contactName: 'David Jones',
      address: {
        lines: ['456 Farm Lane'],
        city: 'Bristol',
        postalCode: 'BS1 2AB'
      },
      country: 'GB',
      email: 'david@ukfarm.co.uk',
      phone: '+44 117 9876 5432'
    },
    importer: null                           // ← Defaults to consignee if not specified
  }
}
```

### 3.2 Field Mapping Table

| Page Model Field       | Journey Model Field                      | Transformation Type | Notes                                           |
| ---------------------- | ---------------------------------------- | ------------------- | ----------------------------------------------- |
| `numberOfAnimals`      | `consignment.animals.numberOfAnimals`    | Direct              | No transformation                               |
| `numberOfAnimals`      | `consignment.animals.numberOfPackages`   | Direct              | Default: same as numberOfAnimals                |
| -                      | `consignment.animals.species`            | Lookup              | From `config/ipaffs-vnet-data.js`               |
| -                      | `consignment.animals.commodityCode`      | Lookup              | From `config/ipaffs-vnet-data.js`               |
| `certificationPurpose` | `consignment.certificationPurpose`       | Direct              | No transformation                               |
| -                      | `consignment.countryOfOrigin`            | Lookup              | From `config/ipaffs-vnet-data.js`               |
| `transportMode`        | `movement.transport.mode`                | Direct              | No transformation                               |
| -                      | `movement.transport.identifier`          | Lookup              | From `config/ipaffs-vnet-data.js` based on mode |
| `journeyDurationHours` | `movement.timing.journeyDurationMinutes` | Convert             | Multiply by 60                                  |
| `arrivalDate`          | `movement.timing.estimatedArrival.date`  | Direct              | Already ISO format (YYYY-MM-DD)                 |
| `arrivalTime`          | `movement.timing.estimatedArrival.time`  | Direct              | Already HH:mm format                            |
| `bcpCode`              | `movement.borderControlPost.code`        | Direct              | No transformation                               |
| `bcpCode`              | `movement.borderControlPost.name`        | Lookup              | From `config/ipaffs-vnet-data.js`               |
| `bcpCode`              | `movement.borderControlPost.portCode`    | Lookup              | From `config/ipaffs-vnet-data.js`               |
| `consignorId`          | `parties.consignor`                      | Lookup              | Full object from config using UUID              |
| `consignorId`          | `movement.origin`                        | Lookup              | Extract address from consignor object           |
| `consigneeId`          | `parties.consignee`                      | Lookup              | Full object from config using UUID              |
| `consigneeId`          | `movement.destination`                   | Lookup              | Extract address from consignee object           |
| -                      | `parties.personResponsible`              | Context             | From logged-in user session (OIDC claims)       |
| -                      | `id`                                     | Generate            | New UUID for notification                       |
| -                      | `status`                                 | Default             | 'DRAFT'                                         |
| -                      | `chedReference`                          | Generate            | Format: DRAFT.GB.{year}.{7-digit-random}        |
| -                      | `createdAt`                              | Generate            | Current timestamp                               |
| -                      | `updatedAt`                              | Generate            | Current timestamp                               |

### 3.3 Reference Data Lookup Examples

**Species Lookup** (from `config/ipaffs-vnet-data.js`):

```javascript
// Page Model has no species field (it's fixed for prototype)
// Journey Model needs full species object:
{
  species: {
    scientificName: 'Bos taurus',
    commonName: 'Cattle'
  },
  commodityCode: '0102'
}
// Source: ipaffsVnetData.commodity.speciesName, .speciesCommonName, .commodityID
```

**BCP Lookup** (from `config/ipaffs-vnet-data.js`):

```javascript
// Page Model: bcpCode = 'GBAPHA1A'
// Journey Model needs full BCP object:
{
  borderControlPost: {
    code: 'GBAPHA1A',
    name: 'Ashford (Dover)',
    portCode: 'GBLGW'
  }
}
// Source: Find matching entry in ipaffsVnetData.portOfEntry array
```

**Consignor/Consignee Lookup** (from `config/ipaffs-vnet-data.js`):

```javascript
// Page Model: consignorId = '8f2fac7f-e1c2-4d4a-832c-cce29afbf9d3'
// Journey Model needs full party object:
{
  consignor: {
    companyName: 'French Farm Exports',
    contactName: 'Marie Dubois',
    address: {
      lines: ['123 Rue de la Ferme'],
      city: 'Lyon',
      postalCode: '69001'
    },
    country: 'FR',
    email: 'marie@frenchfarm.fr',
    phone: '+33 4 7890 1234'
  }
}
// Source: Find matching entry in ipaffsVnetData.consignor/consignee arrays using UUID
```

### 3.4 Implementation Notes

**Prototype Scope**: The current implementation does NOT perform this transformation. The `review.js` controller generates a CHED reference and clears the session, but does not transform or submit data to a backend API.

**Future Work**:

1. Create transformation service: `src/server/import/services/journey-transformer.js`
2. Implement field mapping logic using config lookups
3. Add validation layer to ensure Journey Model satisfies domain invariants (Section 2.6)
4. Create CHED Model transformation (Journey Model → IPAFFS API format)
5. Implement backend API client for submission
6. Add error handling for lookup failures (missing BCP code, invalid party ID, etc.)

**Testing Strategy**:

- Unit tests: Page Model → Journey Model transformation with mock config data
- Integration tests: Full transformation with real config files
- Validation tests: Ensure domain invariants are enforced
- Contract tests: Journey Model → CHED Model matches IPAFFS API schema
