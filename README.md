# trade-demo-frontend

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_trade-demo-frontend&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_trade-demo-frontend)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_trade-demo-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_trade-demo-frontend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_trade-demo-frontend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_trade-demo-frontend)

---

Node.js/Hapi.js frontend demonstrating CDP platform integration with a Java Spring Boot backend.

**What it demonstrates:**

- DEFRA ID OIDC authentication (OAuth2 + OpenID Connect)
- Direct service-to-service communication with Java backend
- CDP trace ID propagation (x-cdp-request-id)
- Server-side session management (Redis)
- GOV.UK Design System multi-step forms
- CRUD operations with client-side search

## Documentation

- [architecture.md](docs/architecture.md)
- [oauth-oidc.md](docs/oauth-oidc.md)

## Quick Start

### Prerequisites

- Node.js >= v22
- Docker and Docker Compose
- Backend repository: `../trade-demo-backend` (MongoDB) or `../trade-demo-postgres-backend` (PostgreSQL)

### Start Services

```bash
make start              # Start MongoDB backend stack + frontend with hot reload
make restart            # Restart the frontend
make debug              # Start in debug mode (debugger on port 9229)
make stop               # Stop all services
make test               # Run unit tests
make test-integration   # Run all tests including integration
make logs               # Show Docker logs
make ps                 # Show service status
make help               # Show all commands
```

`make start` launches:

- **Docker**: Redis, DEFRA ID stub (port 3200), LocalStack, MongoDB, Backend (port 8085), postgres (with liquibase schema and data), trade-commodity-codes (port 8086)
- **Native**: Frontend with hot reload (port 3000)

Access at http://localhost:3000

The first time you run the app, you'll need to register a test user:

```bash
make register-user
```

## Development Workflow

### Local Development (without Docker)

If you prefer to run services individually:

```bash
# Start infrastructure services
docker compose up redis defra-id-stub -d

# Start your chosen backend from its repository
cd ../trade-demo-backend && npm run dev           # MongoDB
# OR
cd ../trade-demo-postgres-backend && mvn spring-boot:run  # PostgreSQL

# Start frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

The frontend expects:

- Backend at `http://localhost:8085` (override with `BACKEND_API_URL`)
- DEFRA ID stub at `http://localhost:3200` (override with `DEFRA_ID_OIDC_CONFIGURATION_URL`)
- Commodity codes at `http://localhost:8086` (override with `COMMODITY_CODES_API_URL`)

### Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run lint          # Lint JS and SCSS
npm run format        # Auto-fix formatting
```

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable information providers in the public sector to license the use and re-use of their information under a common open licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
