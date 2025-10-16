ARG PARENT_VERSION=2.8.5-node22.16.0
ARG PORT=3000
ARG PORT_DEBUG=9229

FROM defradigital/node-development:${PARENT_VERSION} AS development
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node-development:${PARENT_VERSION}

ENV TZ="Europe/London"

ARG PORT
ARG PORT_DEBUG
ENV PORT=${PORT}
EXPOSE ${PORT} ${PORT_DEBUG}

# Skip husky install in Docker (CI environment)
ENV HUSKY=0

COPY --chown=node:node --chmod=755 package*.json .npmrc ./
RUN npm ci --ignore-scripts
COPY --chown=node:node --chmod=755 . .

# Frontend assets built on host before Docker build (not in Dockerfile)
# This matches CDP's GitHub Actions pattern where webpack builds on host
#
# Reasons for host build:
# 1. @defra/cdp-auditing postinstall script hangs in Docker
#    (see docs/DOCKER_BUILD_INVESTIGATION.md)
# 2. webpack/sass-embedded hangs due to platform emulation issues
#    (see docs/WEBPACK_BUILD_INVESTIGATION.md)
# 3. CDP template uses same pattern in .github/workflows/
#    (builds on host, uses 'set +e' to ignore Docker build errors)
#
# Build command: npm run build:frontend
# Or use Makefile which handles this automatically: make dev-all

CMD [ "npm", "run", "docker:dev" ]

FROM development AS production_build

ENV NODE_ENV=production

RUN npm run build:frontend

FROM defradigital/node:${PARENT_VERSION} AS production
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node:${PARENT_VERSION}

ENV TZ="Europe/London"

# Add curl to template.
# CDP PLATFORM HEALTHCHECK REQUIREMENT
USER root
RUN apk add --no-cache curl
USER node

COPY --from=production_build /home/node/package*.json ./
COPY --from=production_build /home/node/src ./src/
COPY --from=production_build /home/node/.public/ ./.public/

RUN npm ci --omit=dev

ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD [ "node", "src" ]
