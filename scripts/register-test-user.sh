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
USER_ID="86a7607c-a1e7-41e5-a0b6-a41680d05a2a"
USER_EMAIL="test@example.com"
USER_NAME="BenTest UserLast"
LOGIN_URL="http://localhost:3000/dashboard"

USER_JSON='{
  "userId": "86a7607c-a1e7-41e5-a0b6-a41680d05a2a",
  "email": "test@example.com",
  "firstName": "BenTest",
  "lastName": "UserLast",
  "loa": "1",
  "aal": "1",
  "enrolmentCount": 1,
  "enrolmentRequestCount": 1,
  "relationships": [
    {
      "organisationName": "Test Imports Organisation",
      "relationshipRole": "Employee",
      "roleName": "Admin",
      "roleStatus": "1"
    }
  ]
}'

RESPONSE=$(register_user "$STUB_URL" "$USER_JSON")
parse_response "$RESPONSE"

if is_success; then
  ADDITIONAL_JSON='{
    "environment": "local",
    "loa": "1",
    "organizations": ["Test Imports Organisation"]
  }'
  print_result_json "true" "$USER_ID" "$USER_EMAIL" "$USER_NAME" "$LOGIN_URL" "$ADDITIONAL_JSON"
  exit 0
else
  print_result_json "false" "" "" "" ""
  exit 1
fi
