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

## Quick Start

### Prerequisites

- Node.js >= v22
- Docker and Docker Compose
- Backend repository: `../trade-demo-backend` (MongoDB) or `../trade-demo-postgres-backend` (PostgreSQL)

### Start Services

```bash
make start              # Start MongoDB backend stack + frontend with hot reload
make debug              # Start in debug mode (debugger on port 9229)
make stop               # Stop all services
make test               # Run unit tests
make test-integration   # Run all tests including integration
make logs               # Show Docker logs
make ps                 # Show service status
make help               # Show all commands
```

`make start` launches:

- **Docker**: Redis, DEFRA ID stub (port 3200), LocalStack, MongoDB, Backend (port 8085)
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

### Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run lint          # Lint JS and SCSS
npm run format        # Auto-fix formatting
```

### Architecture: Native Frontend + Docker Infrastructure

The frontend service is NOT in `compose.yml` because it cannot run under emulation.
Docker Compose is used only for infrastructure because the CDP node-development
base image is not multi-arch, it will not run on Apple Silicon.

Consequently, we need to run the frontend natively on the host machine.

| Component      | Where                   | Why                                                        |
| -------------- | ----------------------- | ---------------------------------------------------------- |
| **Frontend**   | Native (Mac arm64)      | Avoids emulation issues, fast hot reload                   |
| webpack + sass | Native (Mac arm64)      | Requires native arm64 binaries, 4s builds vs infinite hang |
| Redis          | Docker (amd64 emulated) | Simple service, stable under emulation                     |
| Database       | Docker (amd64 emulated) | MongoDB or PostgreSQL, stable under emulation              |
| Backend (Java) | Docker (amd64 emulated) | JVM bytecode, stable under emulation                       |
| LocalStack     | Docker (amd64 emulated) | AWS services emulation                                     |

## CDP CI/CD:

CDP's GitHub Actions don't build inside Docker either:

```yaml
# CDP's actual pattern (simplified)
- run: npm ci # ← Runs on GitHub amd64 runner (host)
- run: npm run build # ← Builds on host, not in Docker
- run: docker build . # ← Copies pre-built assets
  env: set +e # ← Ignore Docker build errors
```

## Troubleshooting

### Docker Compose won't start

```bash
# Check backend repo exists
ls ../trade-demo-backend          # MongoDB backend required for default stack

# View service status
docker compose ps

# Check logs
docker compose logs -f redis
docker compose logs -f defra-id-stub
docker compose logs -f mongodb
docker compose logs -f trade-demo-backend

# Clean restart
make stop && make start
```

### Frontend won't start

If `npm run dev` fails to start:

```bash
# Check if webpack build assets exist
ls .public/

# Rebuild frontend assets
npm run build:frontend

# Check for port conflicts
lsof -i :3000

# Try starting again
make start
```

### Authentication issues

If you can't log in:

```bash
# Register a test user with DEFRA ID stub
make register-user

# Check DEFRA ID stub is running
curl http://localhost:3200/cdp-defra-id-stub/.well-known/openid-configuration

# Check environment variables
grep DEFRA_ID .env
```

## Useful Docker Commands

```bash
# Start MongoDB backend stack (default)
docker compose --profile mongo up -d

# Start specific services
docker compose up redis defra-id-stub -d       # Just infrastructure
docker compose up redis defra-id-stub mongodb trade-demo-backend -d  # Full stack

# View service logs
docker compose logs -f                         # All running services
docker compose logs -f defra-id-stub           # DEFRA ID stub
docker compose logs -f trade-demo-backend      # Backend
docker compose logs -f redis                   # Redis only

# Rebuild specific service
docker compose --profile mongo up --build trade-demo-backend

# Access container shells
docker compose exec trade-demo-backend sh      # Backend shell
docker compose exec mongodb mongosh            # MongoDB shell
docker compose exec redis redis-cli            # Redis shell

# Stop and remove everything including volumes
docker compose down -v
```

## Environment Variables

### Required

- `SESSION_COOKIE_PASSWORD` - Min 32 characters for cookie encryption
- `BACKEND_API_URL` - Backend service URL
- `DEFRA_ID_OIDC_CONFIGURATION_URL` - DEFRA ID OIDC discovery endpoint
- `DEFRA_ID_CLIENT_ID` - OAuth2 client ID
- `DEFRA_ID_CLIENT_SECRET` - OAuth2 client secret
- `DEFRA_ID_SERVICE_ID` - DEFRA ID service identifier
- `APP_BASE_URL` - Application base URL for OAuth callbacks

### Optional

- `PORT` - Server port (default: 3000)
- `SESSION_CACHE_ENGINE` - `redis` or `memory` (default: memory in dev)
- `REDIS_HOST` - Redis server (default: 127.0.0.1)
- `LOG_LEVEL` - Logging level (default: info)
- `DEFRA_ID_TOKEN_REFRESH_BUFFER_MINUTES` - Token refresh buffer in minutes (default: 1)

### Example `.env`

```bash
# Session
SESSION_COOKIE_PASSWORD=the-password-must-be-at-least-32-characters-long
SESSION_CACHE_ENGINE=memory

# Backend
BACKEND_API_URL=http://localhost:8085

# DEFRA ID (using local stub)
DEFRA_ID_OIDC_CONFIGURATION_URL=http://localhost:3200/cdp-defra-id-stub/.well-known/openid-configuration
DEFRA_ID_CLIENT_ID=test-client
DEFRA_ID_CLIENT_SECRET=test-secret
DEFRA_ID_SERVICE_ID=test-service
APP_BASE_URL=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

## Architecture

### Authentication (DEFRA ID OIDC)

Implements OAuth2/OpenID Connect authentication using idiomatic Hapi.js patterns:

**Plugin Architecture:**

- `src/plugins/auth.js` - Registers authentication strategies (Bell + Cookie)
- `src/server/auth/index.js` - Defines auth routes (login, callback, logout)
- `src/plugins/auth/defra-id-strategy.js` - Bell strategy configuration
- `src/auth/oidc-well-known-discovery.js` - OIDC endpoint discovery
- `src/auth/refresh-tokens.js` - Token refresh logic

**Authentication Flow:**

1. User accesses protected route (e.g., `/dashboard`)
2. @hapi/cookie redirects to `/auth/login` (preserves original URL in `next` parameter)
3. `/auth/login` redirects to DEFRA ID OAuth authorization endpoint
4. User authenticates with DEFRA ID
5. DEFRA ID redirects to `/auth/callback` with authorization code
6. Callback exchanges code for tokens, stores in Yar (Redis)
7. User redirected to original URL (from `next` parameter)

**Session Management:**

- **@hapi/cookie**: Validates requests, manages browser cookies
- **Yar (Redis)**: Server-side storage for tokens and user data
- **Custom validate function**: Reads from Yar, automatically refreshes expired tokens
- **Token refresh**: Happens transparently with configurable buffer (default: 1 minute before expiry)

**Key Patterns:**

- Separation of authentication strategies (infrastructure) and routes (application logic)
- Hybrid cookie + server-side session (security best practice)
- Automatic token refresh in validate hook (transparent to application)
- Redirect path preservation using @hapi/cookie's `appendNext`
- Login hint preservation for cross-system SSO

### Backend Integration

Direct HTTP communication with backend service (no API gateway). The frontend works with either MongoDB or PostgreSQL backend - both expose identical REST APIs:

```javascript
import { exampleApi } from '../common/helpers/api-client.js'

const traceId = request.headers['x-cdp-request-id']
const examples = await exampleApi.findAll(traceId)
```

**Local development:**

- Backend (either): `http://localhost:8085`
- Set via `BACKEND_API_URL` environment variable

### Session Management

Server-side sessions with `@hapi/yar`:

- Redis in production (CDP auto-provisioned)
- Memory cache for local dev
- 4-hour timeout
- Only encrypted session ID sent to browser

```javascript
import {
  setSessionValue,
  getSessionValue,
  clearSessionValue
} from '../common/helpers/session-helpers.js'

setSessionValue(request, 'example.name', 'Test')
const name = getSessionValue(request, 'example.name')
clearSessionValue(request, 'example')
```

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable information providers in the public sector to license the use and re-use of their information under a common open licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
