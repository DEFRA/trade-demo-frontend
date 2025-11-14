#!/bin/bash

# Redis Session Inspector
# Displays all session keys and values stored in Redis for this application
#
# Usage:
#   ./scripts/inspect-redis-sessions.sh
#
# Requirements:
#   - Docker Compose with Redis service running
#   - jq (for JSON parsing and URL decoding)

set -e

# Configuration
REDIS_CONTAINER="redis"
KEY_PATTERN="${KEY_PATTERN:-trade-demo-frontend:*}"
SHOW_TTL="${SHOW_TTL:-true}"
COLOR_OUTPUT="${COLOR_OUTPUT:-true}"

# Colors
if [ "$COLOR_OUTPUT" = "true" ] && [ -t 1 ]; then
  BOLD="\033[1m"
  DIM="\033[2m"
  RED="\033[31m"
  GREEN="\033[32m"
  YELLOW="\033[33m"
  BLUE="\033[34m"
  CYAN="\033[36m"
  RESET="\033[0m"
else
  BOLD=""
  DIM=""
  RED=""
  GREEN=""
  YELLOW=""
  BLUE=""
  CYAN=""
  RESET=""
fi

# Check dependencies
command -v jq >/dev/null 2>&1 || {
  echo "Error: jq is required but not installed."
  echo "Install with: brew install jq"
  exit 1
}

command -v docker >/dev/null 2>&1 || {
  echo "Error: docker is required but not installed."
  exit 1
}

# Check if Redis container is running
if ! docker compose ps "$REDIS_CONTAINER" 2>/dev/null | grep -q "Up"; then
  echo "Error: Redis container is not running."
  echo "Start with: docker compose up redis -d"
  exit 1
fi

# Header
echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${CYAN}                    Redis Session Inspector${RESET}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# Get all keys
KEYS=$(docker compose exec -T "$REDIS_CONTAINER" redis-cli KEYS "$KEY_PATTERN" 2>/dev/null)

if [ -z "$KEYS" ]; then
  echo -e "${YELLOW}No sessions found matching pattern: ${KEY_PATTERN}${RESET}"
  echo ""
  echo "Possible reasons:"
  echo "  • No user is currently logged in"
  echo "  • Sessions have expired"
  echo "  • Application is using memory cache (check SESSION_CACHE_ENGINE)"
  echo ""
  exit 0
fi

# Count sessions
SESSION_COUNT=$(echo "$KEYS" | wc -l | tr -d ' ')
echo -e "${GREEN}Found ${BOLD}${SESSION_COUNT}${RESET}${GREEN} session(s)${RESET}"
echo ""

# Process each key
COUNTER=0
echo "$KEYS" | while read -r key; do
  [ -z "$key" ] && continue

  COUNTER=$((COUNTER + 1))

  # Decode URL-encoded key
  DECODED_KEY=$(jq -Rr '@urid' <<< "$key")

  echo -e "${BOLD}${BLUE}━━━ Session $COUNTER/$SESSION_COUNT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
  echo -e "${BOLD}Key (decoded):${RESET}"
  echo -e "  ${GREEN}$DECODED_KEY${RESET}"
  echo ""
  echo -e "${DIM}Key (raw):${RESET}"
  echo -e "  ${DIM}$key${RESET}"
  echo ""

  # Get value
  VALUE=$(docker compose exec -T "$REDIS_CONTAINER" redis-cli --raw GET "$key" 2>/dev/null)

  if [ -z "$VALUE" ]; then
    echo -e "${RED}(No value found)${RESET}"
  else
    echo -e "${BOLD}Value:${RESET}"

    # Try to parse as JSON
    if echo "$VALUE" | jq -e . >/dev/null 2>&1; then
      # Pretty print JSON with color
      if [ "$COLOR_OUTPUT" = "true" ]; then
        echo "$VALUE" | jq -C '.' | sed 's/^/  /'
      else
        echo "$VALUE" | jq '.' | sed 's/^/  /'
      fi
    else
      # Not JSON, show raw
      echo "  $VALUE"
    fi
  fi

  # Show TTL if enabled
  if [ "$SHOW_TTL" = "true" ]; then
    TTL=$(docker compose exec -T "$REDIS_CONTAINER" redis-cli TTL "$key" 2>/dev/null | tr -d '\r')

    echo ""

    if [ "$TTL" = "-1" ]; then
      echo -e "${YELLOW}⏱️  TTL: No expiration set${RESET}"
    elif [ "$TTL" = "-2" ]; then
      echo -e "${RED}⏱️  TTL: Key does not exist (expired?)${RESET}"
    elif [ "$TTL" -lt 60 ]; then
      echo -e "${RED}⏱️  TTL: ${TTL} seconds (expiring soon!)${RESET}"
    elif [ "$TTL" -lt 300 ]; then
      MINUTES=$((TTL / 60))
      echo -e "${YELLOW}⏱️  TTL: ${TTL} seconds (~${MINUTES} minutes)${RESET}"
    else
      MINUTES=$((TTL / 60))
      HOURS=$((TTL / 3600))
      if [ "$HOURS" -gt 0 ]; then
        echo -e "${GREEN}⏱️  TTL: ${TTL} seconds (~${HOURS}h ${MINUTES}m)${RESET}"
      else
        echo -e "${GREEN}⏱️  TTL: ${TTL} seconds (~${MINUTES} minutes)${RESET}"
      fi
    fi
  fi

  echo ""
done

# Footer
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# Show Redis info
echo -e "${DIM}Redis Info:${RESET}"
REDIS_INFO=$(docker compose exec -T "$REDIS_CONTAINER" redis-cli INFO server 2>/dev/null | grep -E "redis_version|os|tcp_port" | tr -d '\r')
echo "$REDIS_INFO" | sed 's/^/  /' | sed 's/:/ = /'
echo ""

# Tips
echo -e "${DIM}💡 Tips:${RESET}"
echo -e "${DIM}  • To see only keys: docker compose exec redis redis-cli KEYS \"${KEY_PATTERN}\"${RESET}"
echo -e "${DIM}  • To delete all sessions: docker compose exec redis redis-cli FLUSHDB${RESET}"
echo -e "${DIM}  • To monitor Redis in real-time: docker compose exec redis redis-cli MONITOR${RESET}"
echo ""
