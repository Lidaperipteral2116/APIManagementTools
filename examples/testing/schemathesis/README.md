# Schemathesis against the Parcelio Shipments API

**What this shows:** property-based API testing generated straight from `specs/demo-api.yaml` with Schemathesis 4.25.2, run against the Prism mock, with an honest account of which checks a mock can and cannot satisfy.

Schemathesis reads the OpenAPI document, generates requests for every operation (explicit examples, schema-derived edge cases, random valid and invalid data, and stateful sequences via inferred links) and checks each response against the spec: documented status codes, content types, headers, response schemas, and a handful of semantic checks (unsupported methods, ignored auth, use-after-free). It needs no test code; `test_api.py` is optional.

## Files

```
schemathesis/
  requirements.txt        schemathesis==4.25.2, pytest==9.1.1
  run.sh                  `./run.sh all` (everything on, fails) and `./run.sh ci` (passing configuration)
  schemathesis.ci.toml    the `ci` configuration as a Schemathesis config file
  hooks.py                4.x extension module: auth provider + before_call hook
  test_api.py             pytest integration (schema.parametrize)
  .env.example            fake credential values read by run.sh / hooks.py
```

## Prerequisites

Python 3.12 or later (3.14 was used here). Prism mock running; from the repo root:

```sh
npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml
```

Install:

```sh
cd examples/testing/schemathesis
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
```

## Command line

`schemathesis run` takes the schema as a positional argument (a file path or URL); the base URL of the server under test goes in `--url`. Headers for every request are `-H`.

Everything on:

```sh
schemathesis run ../../../specs/demo-api.yaml --url http://127.0.0.1:4010 \
  -H "X-API-Key: demo" -H "Authorization: Bearer demo" \
  --checks all --max-examples 20 --report junit \
  --request-timeout 3 --workers 4
```

That is `./run.sh all`. The two flags after `--report junit` are not in the task's original command; without `--request-timeout` the run never finishes, see "Prism hangs on malformed JSON" below. `--workers 4` only shortens the wall-clock time.

Passing configuration (`./run.sh ci`):

```sh
schemathesis run ../../../specs/demo-api.yaml --url http://127.0.0.1:4010 \
  -H "X-API-Key: demo" -H "Authorization: Bearer demo" \
  --checks not_a_server_error,status_code_conformance,content_type_conformance,response_headers_conformance,unsupported_method,use_after_free,ensure_resource_availability \
  --phases examples,fuzzing --mode positive --max-examples 20 --request-timeout 10 \
  --exclude-operation-id getShipmentLabel \
  --exclude-operation-id uploadShipmentDocument \
  --exclude-operation-id updateShipment \
  --generation-deterministic --report junit
```

The JUnit file lands in `schemathesis-report/junit-<timestamp>.xml` (override with `--report-junit-path`). The same configuration as a config file: `schemathesis --config-file schemathesis.ci.toml run ../../../specs/demo-api.yaml` (the file is deliberately not named `schemathesis.toml`, because that name is auto-discovered from the working directory and would silently apply to the "everything on" run as well). Both variants were run and pass.

## Expected output

### `./run.sh ci` (real output, trimmed)

```
Schemathesis v4.25.2
━━━━━━━━━━━━━━━━━━━━

 ✅  Loaded specification from ../../../specs/demo-api.yaml (in 0.11s)

     Base URL:         http://127.0.0.1:4010
     Specification:    Open API 3.1.0
     Operations:       26 selected / 29 total

 ✅  Examples (in 0.29s)

     ✅ 23 passed  ⏭   3 skipped

 ✅  Fuzzing (in 3.36s)

     ✅ 26 passed

=================================== WARNINGS ===================================

Schema validation mismatch: 3 operations mostly rejected generated data due to validation errors, indicating schema constraints don't match API validation

  - POST /addresses/validate
  - POST /pickups
  - POST /rates

=================================== SUMMARY ====================================

API Operations:
  Selected: 26/29
  Tested: 26

Test Phases:
  ✅ Examples
  ⏭  Coverage (disabled)
  ✅ Fuzzing
  ⏭  Stateful (disabled)

Test cases:
  486 generated, 486 passed

Reports:
  - JUNIT: schemathesis-report/junit-20260901T221734Z.xml

============================== 1 warning in 3.69s ==============================
```

Exit code 0. The three "skipped" examples are operations with no request body and no explicit example. The warning is explained below (email format).

### `./run.sh all` (real output, trimmed)

```
     Operations:       29 selected / 29 total

 ❌  Examples (in 0.55s)
     ✅  8 passed  ❌ 17 failed  ⏭   4 skipped

 ❌  Coverage (in 0.88s)
     ❌ 29 failed

 🚫  Fuzzing (in 58.67s)
     ✅  5 passed  ❌ 19 failed  🚫  5 errors

 🚫  Stateful (in 3.80s)
     Scenarios:    12
     API Links:    1 covered / 135 selected / 135 total (135 inferred)
     ✅ 9 passed  ❌ 3 failed

=================================== SUMMARY ====================================

Failures:
  ❌ API accepts invalid authentication: 16
  ❌ API accepted schema-violating request: 4
  ❌ API rejected schema-compliant request: 5
  ❌ Undocumented HTTP status code: 8
  ❌ Unsupported methods: 18
Errors:
  🚫 Network Error: 5
  🚫 Schema Error: 1
Test cases:
  339 generated, 50 found 51 unique failures, 98 skipped

======================= 51 failures, 6 errors in 63.97s ========================
```

Exit code 1.

### pytest (real output)

```
$ python -m pytest test_api.py -q
..........................                                               [100%]
26 passed in 4.01s
```

## Failures with `--checks all`, one by one

Every category below was reproduced by hand with `curl` against Prism 5.16.0 before being classified.

| Check | Count | What happened | Verdict |
|---|---|---|---|
| `ignored_auth` ("API accepts invalid authentication") | 16 | Schemathesis re-sends a request with a wrong `X-API-Key` and expects 401. Prism only checks that the header is present, so any value gets 200. | Prism artefact. A mock has no key store. |
| `unsupported_method` ("Unsupported methods") | 18 | `TRACE /rates` and friends get `405` from Prism, but without the `Allow` header RFC 9110 requires. | Prism artefact (its 405 error body is Prism's own). A real server should send `Allow`. |
| `negative_data_rejection` ("API accepted schema-violating request") | 4 | A query string with an unknown parameter (`x-schemathesis-unknown-property=42`) on `GET .../documents` returned 200. | Prism artefact by design: Prism ignores unknown query parameters. Arguably correct for a real API too; this check is opinionated. |
| `positive_data_acceptance` ("API rejected schema-compliant request") | 5 | Schemathesis generates `email: "0@com"`, which satisfies its own `format: email` strategy; Prism's validator (ajv-formats) says it is not an email and returns 422. | Validator disagreement, not a spec defect. It only surfaces as a failure on `updateShipment` because that operation is the one that does not document 422 (below). On `validateAddress`, `quoteRates` and `schedulePickup` the same rejection is a documented 422, so the run just warns "mostly rejected generated data". |
| `status_code_conformance` ("Undocumented HTTP status code") | 8 | (a) `updateShipment` returns 422 on the email case above, spec lists only 200/401/404/409. (b) Path parameters that violate the `pattern` (`DELETE /packages/%C2%84`) get 422 from Prism; the spec documents 404 for unknown ids but nothing for malformed ids. (c) Same for query parameters, `GET /carriers?limit=101` gets 422, spec documents 200/401 only. | Spec defects, found by the tool: the spec has no 400/422 response on several operations whose parameters carry `pattern`/`minimum`/`maximum` constraints. Whether a real server would answer 400, 404 or 422 is a design choice; the spec should say. |
| Network Error | 5 | `POST /pickups` (and four other JSON operations) with body `\x00` timed out after 3 s. | Prism bug, see below. |
| Schema Error (stateful) | 1 | `Pointer '/x-bundled/schema291' does not exist` while building stateful scenarios. | Schemathesis 4.25.2 issue with this 3.1 document's bundled refs, only in the stateful phase. Reproduced again on 2026-09-02 with `--phases stateful` (`Pointer '/x-bundled/schema139' does not exist`; the schema number varies between runs). 4.25.2 was the newest release on PyPI that day (`pip index versions schemathesis`), the Unreleased section of the upstream changelog lists no related fix, and the issue tracker has no matching open issue (searched `x-bundled`, `Pointer`). Not yet reported upstream. |
| `response_schema_conformance`, `content_type_conformance`, `response_headers_conformance` | 0 | All passed. The binary `getShipmentLabel` endpoint answers `200 application/pdf` with the literal body `string`, which is a valid `type: string` per the spec, so the schema check cannot catch it. | Prism artefact that the checks cannot see; excluded from CI anyway because a body of `string` is not a label. |

### Prism hangs on malformed JSON

Prism 5.16.0 never responds to a request whose `Content-Type` is `application/json` and whose body is not parseable JSON. Reproduce:

```sh
curl --max-time 5 -X POST -H "Authorization: Bearer d" -H "Content-Type: application/json" \
  -d 'x' http://127.0.0.1:4010/shipments
# curl: (28) Operation timed out
```

With `Content-Type: application/octet-stream` or no content type the same body gets a 422 immediately. Schemathesis' negative mode sends exactly this kind of body (a single NUL byte) to every JSON operation, so a run without `--request-timeout` sits on the first one forever with the connection open (the default in-library timeout does not help because Prism never closes the socket either). Set `--request-timeout` (CLI), `request-timeout` (config file) or `timeout=` (pytest, `case.call_and_validate(..., timeout=10)`) whenever the target is Prism. Prism 5.16.0 was the newest release on npm as of 2026-09-02 (`npm view @stoplight/prism-cli version`), so there is no later release to try. The Prism issue tracker has nothing matching this hang; the closest, https://github.com/stoplightio/prism/issues/2664, describes an `invalid_json` error response for a malformed body on 5.12.0, which is what you would want and not what 5.16.0 does here (re-checked 2026-09-02: `[`, `{bad` and a NUL byte all time out, with or without the bearer token; a syntactically valid but schema-invalid body gets 422 at once).

### Why the CI configuration excludes what it excludes

- `--mode positive`: only schema-valid data. It removes the malformed-body hang and the "undocumented 422 for a bad `limit`" class, which is the spec's gap, not the mock's.
- `--phases examples,fuzzing`: the coverage phase is where unsupported-method probing (TRACE) and boundary values live; both trip on Prism. The stateful phase hits the schema error above.
- Checks kept: `not_a_server_error`, `status_code_conformance`, `content_type_conformance`, `response_headers_conformance`, `unsupported_method`, `use_after_free`, `ensure_resource_availability`. `unsupported_method` passes in this configuration because it needs the coverage phase to do anything. Dropped: `ignored_auth`, `negative_data_rejection`, `positive_data_acceptance`, `missing_required_header`, `allow_header_conformance`, `response_schema_conformance` (the last one passes, it is dropped only because a mock echoing its own examples proves nothing about a real server; put it back when pointing at a real deployment).
- `getShipmentLabel`: Prism returns the string `string` for a binary response.
- `uploadShipmentDocument`: multipart with a binary part; Prism accepted every generated upload with 201 and the check has nothing to verify.
- `updateShipment`: the only operation on which the email-format disagreement becomes a failure, because the spec does not document a 422 for it. That is a spec defect; the exclusion is documented so it is not forgotten.

## hooks.py

Schemathesis 4 loads extension code from the module named in `SCHEMATHESIS_HOOKS`, importable from the current directory:

```sh
SCHEMATHESIS_HOOKS=hooks schemathesis run ../../../specs/demo-api.yaml --url http://127.0.0.1:4010 --mode positive --request-timeout 10
```

The module registers an auth provider (`@schemathesis.auth()`) that puts `X-API-Key` on every request and `Authorization: Bearer` only on operations whose own `security` names `OAuth2`, which is closer to how the API is specified than two blanket `-H` flags. Verified with a VCR cassette: `GET /shipments/{id}` requests carried no `Authorization`, `POST /shipments` did. One gotcha found on the way: the provider's `get()` result is cached across operations (default refresh 300 s), so the per-operation decision has to live in `set()`.

It also registers a `before_call` hook that adds an `Idempotency-Key` to `createShipment`. What it does not do is filter operations: 4.x has no `filter_operations`-style hook. Use `--exclude-operation-id`, `schema.exclude(...)` in Python, or `[[operations]]` tables with `enabled = false` in the config file (all three are used in this folder).

## test_api.py

```python
schema = schemathesis.openapi.from_path(SPEC).exclude(operation_id=[...])
schema.config.generation.update(modes=["positive"], max_examples=20, deterministic=True)
schema.config.phases.update(phases=["examples", "fuzzing"])

@schema.parametrize()
def test_api(case):
    case.call_and_validate(base_url=BASE_URL, headers=HEADERS, checks=CI_CHECKS, timeout=10)
```

The check functions are imported from `schemathesis.specs.openapi.checks` (plus `not_a_server_error` from `schemathesis.checks`); the names are not importable from `schemathesis.checks` at import time because the OpenAPI checks register lazily. One cosmetic difference from the CLI: when `base_url` is passed per call, the "Reproduce with" curl line in a pytest failure shows the spec's first server (`http://localhost/v1/...`) instead of the Prism URL.

## CI

```yaml
- run: npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml &
- run: |
    for i in $(seq 1 30); do curl -sf -o /dev/null -H "X-API-Key: ci" http://127.0.0.1:4010/carriers && break; sleep 1; done
- uses: actions/setup-python@v5
  with: { python-version: "3.12" }
- run: |
    cd examples/testing/schemathesis
    pip install -r requirements.txt
    ./run.sh ci
    python -m pytest test_api.py -q
```

## Notes

- What worked cleanly: loading the OpenAPI 3.1 document, `--url`, `-H`, `--exclude-operation-id`, `--mode`, `--phases`, `--report junit`, the config file (`base-url`, `headers` with `${ENV}` expansion, `[[operations]]`, per-check `enabled`), and the pytest plugin. The per-operation explanations in the failure output are good enough to hand to whoever owns the spec.
- What needed hand-editing: every "everything on" invocation needs `--request-timeout` against Prism (hang above). The check-function import path in `test_api.py` (see above). `SchemathesisConfig.update()` has no `base_url`; pass it to `call_and_validate` or set `base-url` in the config file.
- Real findings about the spec, worth fixing in a copy (the shared spec is left as is on purpose): no 400/422 documented on `updateShipment`, on the `DELETE` operations, or on list endpoints whose parameters carry constraints; `Problem.status` example is 404 on every error response, which Prism then serves for 401 and 422 as well.
- Counts: examples/fuzzing counts vary between runs unless `--generation-deterministic` (or `--seed`) is used; the `ci` numbers above are from a deterministic run, the `all` numbers from one seeded run (seed printed in the output). [MEASURE: run `./run.sh all` three times and report the spread of "generated" and "unique failures".]
