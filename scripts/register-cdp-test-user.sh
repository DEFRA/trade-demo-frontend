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
USER_ID="a8f3c2d1-9b5e-4a7c-8d6f-1e2a3b4c5d6e"
USER_EMAIL="sarah.trader@acme-imports.example.com"
USER_NAME="Sarah Trader"
LOGIN_URL="https://trade-demo-frontend.${ENVIRONMENT}.cdp-int.defra.cloud/dashboard"

USER_JSON='{
  "userId": "a8f3c2d1-9b5e-4a7c-8d6f-1e2a3b4c5d6e",
  "email": "sarah.trader@acme-imports.example.com",
  "firstName": "Sarah",
  "lastName": "Trader",
  "loa": "2",
  "aal": "2",
  "enrolmentCount": 3,
  "enrolmentRequestCount": 1,
  "relationships": [
    {
      "organisationName": "ACME International Imports Ltd",
      "relationshipRole": "Employee",
      "roleName": "Trade Compliance Manager",
      "roleStatus": "1"
    },
    {
      "organisationName": "British Chamber of Commerce",
      "relationshipRole": "Member",
      "roleName": "Authorised Representative",
      "roleStatus": "1"
    },
    {
      "organisationName": "UK Border Agency",
      "relationshipRole": "Registered Trader",
      "roleName": "Import Manager",
      "roleStatus": "1"
    }
  ]
}'

RESPONSE=$(register_user "$STUB_URL" "$USER_JSON")
parse_response "$RESPONSE"

if is_success; then
  ADDITIONAL_JSON=$(cat <<EOF
{
  "environment": "${ENVIRONMENT}",
  "loa": "2",
  "aal": "2",
  "organizations": [
    "ACME International Imports Ltd",
    "British Chamber of Commerce",
    "UK Border Agency"
  ],
  "roles": [
    "Trade Compliance Manager",
    "Authorised Representative",
    "Import Manager"
  ],
  "expireUrl": "${STUB_URL}/cdp-defra-id-stub/API/register/${USER_ID}/expire"
}
EOF
)
  print_result_json "true" "$USER_ID" "$USER_EMAIL" "$USER_NAME" "$LOGIN_URL" "$ADDITIONAL_JSON"
  exit 0
else
  print_result_json "false" "" "" "" ""
  exit 1
fi