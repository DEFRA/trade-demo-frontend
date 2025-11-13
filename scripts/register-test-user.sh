#!/usr/bin/env bash
set -e

# Register a test user with the local DEFRA ID stub
# This must be done before attempting OAuth login
#
# Output: JSON (can be piped to jq)
# Usage: ./scripts/register-test-user.sh
#        ./scripts/register-test-user.sh | jq -r '.loginUrl'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/defra-id-registration.sh"

STUB_URL="http://localhost:3200"
USER_ID="c9606501-44fe-ea11-a813-000d3aaa467a"
USER_EMAIL="kaiatkinson@jourrapide.com"
USER_NAME="Kai Atkinson"
LOGIN_URL="http://localhost:3000/dashboard"

USER_JSON='{
  "userId": "c9606501-44fe-ea11-a813-000d3aaa467a",
  "email": "kaiatkinson@jourrapide.com",
  "firstName": "Kai",
  "lastName": "Atkinson",
  "loa": "1",
  "aal": "1",
  "enrolmentCount": 1,
  "enrolmentRequestCount": 1,
  "relationships": [
    {
      "organisationName": "Kai Inc.",
      "relationshipRole": "Employee",
      "roleName": "Admin",
      "roleStatus": "1"
    }
  ]
}'

RESPONSE=$(register_user "$STUB_URL" "$USER_JSON")
parse_response "$RESPONSE"

if is_success; then
  # Build additional JSON using jq to avoid quoting issues (compact output)
  ADDITIONAL_JSON=$(jq -nc \
    --arg env "local" \
    --arg loa "1" \
    --arg org "Kai Inc." \
    '{environment: $env, loa: $loa, organizations: [$org]}')

  print_result_json "true" "$USER_ID" "$USER_EMAIL" "$USER_NAME" "$LOGIN_URL" "$ADDITIONAL_JSON"
  exit 0
else
  print_result_json "false" "" "" "" ""
  exit 1
fi
