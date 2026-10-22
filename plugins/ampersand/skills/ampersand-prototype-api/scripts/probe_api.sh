#!/usr/bin/env bash
#
# probe_api.sh — read-only discovery of a running Ampersand prototype's API.
#
# Confirms the base URL is reachable, lists resources for a top-level concept,
# and GETs one resource so you can see the real JSON envelope before doing any
# work. Does NOT mutate anything.
#
# Usage:
#   ./probe_api.sh [BASE_URL] [CONCEPT] [ATOM_ID]
#
# Examples:
#   ./probe_api.sh                                   # defaults to http://localhost
#   ./probe_api.sh http://localhost:8080
#   ./probe_api.sh http://localhost Person
#   ./probe_api.sh http://localhost Person "PersonName 1"
#
# Requires: curl. Uses jq for pretty output if available.

set -uo pipefail

BASE_URL="${1:-http://localhost}"
CONCEPT="${2:-}"
ATOM_ID="${3:-}"
API_ROOT="${BASE_URL%/}/api/v1"

pretty() {
  if command -v jq >/dev/null 2>&1; then jq .; else cat; fi
}

get() {
  # $1 = path (already URL-encoded where needed)
  echo "GET $1" >&2
  curl -fsS -H "Accept: application/json" "$1"
}

echo "== Reachability ==" >&2
if curl -fsS -o /dev/null "$BASE_URL"; then
  echo "Base URL reachable: $BASE_URL" >&2
else
  echo "WARNING: $BASE_URL not reachable. Check 'docker ps' for a mapped port." >&2
fi

echo >&2
echo "== API root: $API_ROOT ==" >&2

if [ -z "$CONCEPT" ]; then
  cat >&2 <<'EOF'

No CONCEPT given. Next steps:
  1. Read interfaces.json (or the .adl INTERFACE blocks) to find a top-level
     interface and its source concept.
  2. Re-run: ./probe_api.sh BASE_URL <Concept>
     to list resources for that concept.
EOF
  exit 0
fi

# URL-encode the atom id if provided (spaces, slashes, etc.).
encode() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$1" | jq -sRr @uri
  else
    # minimal fallback: encode spaces only
    printf '%s' "${1// /%20}"
  fi
}

echo >&2
echo "== List resources for concept: $CONCEPT ==" >&2
LIST_JSON="$(get "$API_ROOT/resource/$CONCEPT")" || {
  echo "Failed to list $CONCEPT. Verify the concept name and that it has a top-level interface." >&2
  exit 1
}
echo "$LIST_JSON" | pretty

if [ -n "$ATOM_ID" ]; then
  ENC_ATOM="$(encode "$ATOM_ID")"
  echo >&2
  echo "== GET one resource: $CONCEPT / $ATOM_ID ==" >&2
  get "$API_ROOT/resource/$CONCEPT/$ENC_ATOM" | pretty
else
  echo >&2
  echo "Tip: pass an ATOM_ID (an _id_ from the list above) to fetch one resource:" >&2
  echo "  ./probe_api.sh $BASE_URL $CONCEPT <atomId>" >&2
fi
