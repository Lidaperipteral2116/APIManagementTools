#!/usr/bin/env bash
# Runs Schemathesis against the Prism mock of specs/demo-api.yaml.
#
#   ./run.sh        # "everything on": all 29 operations, --checks all. Fails; shows Prism artefacts.
#   ./run.sh ci     # documented passing configuration for CI (exit 0 against Prism).
#
# Prism must already be listening on http://127.0.0.1:4010 (start it from the repo root:
#   npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml).
set -euo pipefail
cd "$(dirname "$0")"

SPEC="../../../specs/demo-api.yaml"
BASE_URL="${BASE_URL:-http://127.0.0.1:4010}"
API_KEY="${PARCELIO_API_KEY:-demo-api-key}"
OAUTH_TOKEN="${PARCELIO_OAUTH_TOKEN:-demo-oauth-token}"

MODE="${1:-all}"

case "$MODE" in
  all)
    # Everything on. Expect failures: see README "Failures with --checks all".
    # --request-timeout is not optional against Prism 5.16.0: it never answers a POST whose
    # application/json body is not valid JSON, and negative-mode fuzzing sends plenty of those.
    exec schemathesis run "$SPEC" \
      --url "$BASE_URL" \
      -H "X-API-Key: $API_KEY" \
      -H "Authorization: Bearer $OAUTH_TOKEN" \
      --checks all \
      --max-examples 20 \
      --request-timeout 3 \
      --workers 4 \
      --report junit
    ;;
  ci)
    # Passing configuration. Each exclusion is explained in README "Why the CI configuration excludes what it excludes".
    exec schemathesis run "$SPEC" \
      --url "$BASE_URL" \
      -H "X-API-Key: $API_KEY" \
      -H "Authorization: Bearer $OAUTH_TOKEN" \
      --checks not_a_server_error,status_code_conformance,content_type_conformance,response_headers_conformance,unsupported_method,use_after_free,ensure_resource_availability \
      --phases examples,fuzzing \
      --mode positive \
      --max-examples 20 \
      --request-timeout 10 \
      --exclude-operation-id getShipmentLabel \
      --exclude-operation-id uploadShipmentDocument \
      --exclude-operation-id updateShipment \
      --generation-deterministic \
      --report junit
    ;;
  *)
    echo "usage: $0 [all|ci]" >&2
    exit 2
    ;;
esac
