#!/usr/bin/env bash
set -e

# Register test user with CDP DEFRA ID stub (deployed environment)
#
# Output: JSON (can be piped to jq)
# Usage: ./scripts/register-cdp-test-user.sh [dev|test|perf]
#        ./scripts/register-cdp-test-user.sh dev | jq -r '.user.email'
#        ./scripts/register-cdp-test-user.sh test | jq '.additional.organizations'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/defra-id-registration.sh"

ENVIRONMENT=${1:-dev}
STUB_URL="https://cdp-defra-id-stub.${ENVIRONMENT}.cdp-int.defra.cloud"
USER_ID="c9606501-44fe-ea11-a813-000d3aaa467a"
USER_EMAIL="kaiatkinson@jourrapide.com"
USER_NAME="Kai Atkinson"
LOGIN_URL="https://trade-demo-frontend.${ENVIRONMENT}.cdp-int.defra.cloud/dashboard"

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
  ADDITIONAL_JSON=$(jq -nc \
    --arg env "$ENVIRONMENT" \
    --arg loa "1" \
    --arg org "Kai Inc." \
    --arg expireUrl "${STUB_URL}/cdp-defra-id-stub/API/register/${USER_ID}/expire" \
    '{environment: $env, loa: $loa, organizations: [$org], expireUrl: $expireUrl}')
  print_result_json "true" "$USER_ID" "$USER_EMAIL" "$USER_NAME" "$LOGIN_URL" "$ADDITIONAL_JSON"
  exit 0
else
  print_result_json "false" "" "" "" ""
  exit 1
fi