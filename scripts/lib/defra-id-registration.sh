#!/usr/bin/env bash

# Shared functions for DEFRA ID stub user registration

# Register a user with the DEFRA ID stub
# Usage: register_user <stub_url> <user_json>
# Returns: HTTP status code
register_user() {
  local stub_url="$1"
  local user_json="$2"

  curl -s -w "\n%{http_code}" -X POST \
    "${stub_url}/cdp-defra-id-stub/API/register" \
    -H "Content-Type: application/json" \
    -d "$user_json"
}

# Parse HTTP response into status code and body
# Sets global variables: HTTP_CODE and RESPONSE_BODY
parse_response() {
  local response="$1"
  HTTP_CODE=$(echo "$response" | tail -n1)
  RESPONSE_BODY=$(echo "$response" | sed '$d')
}

# Check if registration was successful
is_success() {
  [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]
}

# Print registration result as JSON
# Usage: print_result_json <success> <user_id> <email> <name> <login_url> [additional_fields_json]
print_result_json() {
  local success="$1"
  local user_id="$2"
  local email="$3"
  local name="$4"
  local login_url="$5"
  local additional_fields="${6:-{}}"

  if [ "$success" = "true" ]; then
    cat <<EOF
{
  "success": true,
  "httpCode": ${HTTP_CODE},
  "user": {
    "id": "${user_id}",
    "email": "${email}",
    "name": "${name}"
  },
  "loginUrl": "${login_url}",
  "additional": ${additional_fields}
}
EOF
  else
    # Escape quotes in response body for JSON
    local escaped_body=$(echo "$RESPONSE_BODY" | sed 's/"/\\"/g' | tr -d '\n')
    cat <<EOF
{
  "success": false,
  "httpCode": ${HTTP_CODE},
  "error": "${escaped_body}"
}
EOF
  fi
}
