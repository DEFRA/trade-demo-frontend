#!/bin/bash
set -e

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly ENV_FILE="$PROJECT_ROOT/.env"
readonly DEFRA_ID_STUB="defra-id-stub"
readonly HEALTH_URL="http://localhost:3200/health"
readonly MAX_HEALTH_ATTEMPTS=30

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly NC='\033[0m' # No Color

# Load environment variables from .env file (without comments)
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
else
  echo -e "${RED}ERROR: .env file not found at $ENV_FILE${NC}"
  exit 1
fi

# Function to wait for service health check
wait_for_health() {
  local attempt=0
  echo "Waiting for DEFRA ID stub to be ready..."

  while [ $attempt -lt $MAX_HEALTH_ATTEMPTS ]; do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ DEFRA ID stub is ready!${NC}"
      return 0
    fi

    attempt=$((attempt + 1))
    if [ $attempt -eq $MAX_HEALTH_ATTEMPTS ]; then
      echo -e "${RED}ERROR: DEFRA ID stub failed to become ready after ${MAX_HEALTH_ATTEMPTS} attempts${NC}"
      return 1
    fi

    echo "Waiting... (attempt $attempt/$MAX_HEALTH_ATTEMPTS)"
    sleep 1
  done
}

# Function to cleanup docker services
cleanup() {
  echo ""
  echo "Stopping DEFRA ID stub..."
  docker compose down "$DEFRA_ID_STUB"
}

# Main execution
main() {
  # Start DEFRA ID stub
  echo "Starting DEFRA ID stub..."
  docker compose up -d "$DEFRA_ID_STUB"

  # Wait for stub to be ready
  if ! wait_for_health; then
    cleanup
    exit 1
  fi

  # Run integration tests
  echo ""
  echo "Running integration tests..."
  set +e  # Temporarily disable exit-on-error to capture test exit code
  vitest run --coverage
  local test_exit=$?
  set -e

  # Cleanup
  cleanup

  # Report results
  echo ""
  if [ $test_exit -eq 0 ]; then
    echo -e "${GREEN}✓ Integration tests passed${NC}"
  else
    echo -e "${RED}✗ Integration tests failed with exit code $test_exit${NC}"
  fi

  exit $test_exit
}

main
