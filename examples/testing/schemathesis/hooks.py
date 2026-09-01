"""Schemathesis 4.x extension module.

Load it with the environment variable, not a CLI flag:

    SCHEMATHESIS_HOOKS=hooks schemathesis run ../../../specs/demo-api.yaml --url http://127.0.0.1:4010

The module must be importable from the current directory (hence `cd` into this
folder first). Two things are shown here:

1. An auth provider (`@schemathesis.auth()`) that sends the API key on every
   request and adds the OAuth2 bearer token only on operations whose OpenAPI
   `security` requirement names `OAuth2`. This is the 4.x replacement for
   header-setting hooks; with it the `-H` flags in run.sh become unnecessary.

2. A `before_call` hook that adds an `Idempotency-Key` to `POST /shipments`,
   the one operation that documents the header.

What is deliberately NOT here: operation filtering. Schemathesis 4 removed the
`filter_operations`-style hooks. Exclude operations with CLI flags
(`--exclude-operation-id getShipmentLabel`), with `schema.exclude(...)` in
pytest (see test_api.py), or with `[[operations]]` tables in a
`schemathesis.toml` next to the command (see README).
"""

from __future__ import annotations

import os
import uuid

import schemathesis

API_KEY = os.environ.get("PARCELIO_API_KEY", "demo-api-key")
OAUTH_TOKEN = os.environ.get("PARCELIO_OAUTH_TOKEN", "demo-oauth-token")


def _requires_oauth2(operation) -> bool:
    """True when the operation's own `security` list mentions the OAuth2 scheme."""
    raw = operation.definition.raw or {}
    for requirement in raw.get("security", []):
        if "OAuth2" in requirement:
            return True
    return False


@schemathesis.auth()
class ParcelioAuth:
    """Static credentials; a real provider would fetch a token in `get`.

    `get` is cached by Schemathesis (refresh interval 300 s by default) and its
    result is reused across operations, so per-operation decisions belong in
    `set`, which runs for every generated case.
    """

    def get(self, case, context):
        return {"api_key": API_KEY, "bearer": OAUTH_TOKEN}

    def set(self, case, data, context):
        case.headers["X-API-Key"] = data["api_key"]
        if _requires_oauth2(context.operation):
            case.headers["Authorization"] = f"Bearer {data['bearer']}"


@schemathesis.hook
def before_call(context, case, kwargs):
    """Add a fresh Idempotency-Key to createShipment so retries are distinguishable."""
    if context.operation is not None and context.operation.definition.raw.get("operationId") == "createShipment":
        case.headers["Idempotency-Key"] = str(uuid.uuid4())
