# Bruno collection for the Parcelio Shipments API

**What this shows:** a hand-written, git-friendly Bruno collection (`.bru` files) for `specs/demo-api.yaml`, with per-request assertions and tests, run headlessly against the Prism mock with the Bruno CLI 4.1.0.

Bruno keeps every request as a plain-text file, so the collection lives next to the spec and diffs in pull requests. The CLI runs the same files that the desktop app opens, so there is nothing to export.

## Layout

```
bruno/
  bruno.json                 collection manifest (name, type, ignore list)
  collection.bru             collection-level auth (X-API-Key) and docs
  environments/local.bru     baseUrl + shipmentId; apiKey and oauthToken declared as secrets
  Carriers/                  List carriers, Get carrier services
  Rates/                     Quote rates
  Addresses/                 Validate address
  Shipments/                 List, Create (Bearer), Get, Dispatch (Bearer),
                             List without key (expects 401),
                             Create with invalid body (expects 422)
  Tracking/                  Track by number
  Webhooks/                  Create subscription (Bearer)
  .env.example               fake credential values for the CLI
```

One folder per OpenAPI tag, `folder.bru` sets the run order (`seq`). Each request has an `assert` block (status, `content-type`, body shape such as `res.body.data: isArray`) and a `tests` block with chai assertions. `Create shipment` stores the returned `id` in `shipmentId` via `vars:post-response`; `Get shipment` and `Dispatch shipment` use it, falling back to the environment default `shp_9f3KqLm2Xa` when run on their own.

## Prerequisites

- Node 22.
- Prism mock running. From the repo root:

```sh
npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml
```

Prism enforces the spec's security: `GET`s need any `X-API-Key`, OAuth2 operations need any `Authorization: Bearer` token, and request bodies are validated.

## Run

From this directory:

```sh
cp .env.example .env   # optional, only documents the fake values
npx -y @usebruno/cli@4.1.0 run -r --env local \
  --env-var apiKey=demo-api-key \
  --env-var oauthToken=demo-oauth-token \
  --reporter-json results.json
```

- `--env local` selects `environments/local.bru`.
- `--env-var name=value` injects the two secret variables. They are listed in the environment file under `vars:secret`, which means the file records the names only; the Bruno app stores the values encrypted outside the repo, and the CLI cannot read that store, so CI has to pass them explicitly. `--env-var` can be repeated.
- `-r` is the recursive flag from the CLI docs. In 4.1.0 a bare `bru run` with no path already runs the whole collection, folders included; `-r` matters when you name a folder (`bru run Shipments -r`).
- `--reporter-json results.json` writes the machine-readable report (`--reporter-junit` and `--reporter-html` also exist; `--output/--format` are deprecated). `results.json` is gitignored.
- Exit code is 0 when every request, assertion and test passes and 1 otherwise, which is what CI needs.

Run one folder only:

```sh
npx -y @usebruno/cli@4.1.0 run Shipments --env local --env-var apiKey=x --env-var oauthToken=y
```

### Safe Mode

Bruno CLI 3.0.0 and later runs scripts and tests in Safe Mode by default (a QuickJS sandbox, no filesystem, no `require` of npm packages). Everything in this collection is plain chai assertions and works in Safe Mode. If a collection needs Node modules, pass `--sandbox developer`.

## Expected output

Trimmed from a real run of `bru run -r --env local --env-var apiKey=demo-api-key --env-var oauthToken=demo-oauth-token --reporter-json results.json` (Bruno CLI 4.1.0, Prism 5.16.0):

```
Carriers/List carriers (200 OK) - 52 ms
Tests
   ✓ first carrier has the fields the spec marks required
Assertions
   ✓ res.status: eq 200
   ✓ res.headers['content-type']: contains application/json
   ✓ res.body.data: isArray
   ✓ res.body.has_more: isBoolean
   ✓ res.body.next_cursor: isDefined
...
Shipments/Create shipment (201 Created) - 11 ms
Tests
   ✓ response echoes the requested service and carries timestamps
Assertions
   ✓ res.status: eq 201
   ✓ res.headers['content-type']: contains application/json
   ✓ res.body.id: matches ^shp_[A-Za-z0-9]{8,}$
   ✓ res.body.status: eq draft
   ✓ res.body.packages: isArray
...
Shipments/List shipments without key (401 Unauthorized) - 47 ms
Tests
   ✓ 401 body is an RFC 9457 problem document
Assertions
   ✓ res.status: eq 401
   ✓ res.headers['content-type']: contains application/problem+json
   ✓ res.body.type: isString
   ✓ res.body.title: isString
Shipments/Create shipment with invalid body (422 Unprocessable Entity) - 22 ms
Tests
   ✓ validation problem lists the failing field
Assertions
   ✓ res.status: eq 422
   ✓ res.headers['content-type']: contains application/problem+json
   ✓ res.body.errors: isArray
   ✓ res.body.errors[0].field: isString
...

📊 Execution Summary
┌───────────────┬────────────────┐
│ Metric        │     Result     │
├───────────────┼────────────────┤
│ Status        │     ✓ PASS     │
├───────────────┼────────────────┤
│ Requests      │ 12 (12 Passed) │
├───────────────┼────────────────┤
│ Tests         │     12/12      │
├───────────────┼────────────────┤
│ Assertions    │     57/57      │
├───────────────┼────────────────┤
│ Duration (ms) │      2989      │
└───────────────┴────────────────┘
Wrote json results to results.json
```

Without the `--env-var` flags the same command produces `Requests 12 (1 Passed, 11 Failed)`, `Assertions 5/57`, exit code 1: every authenticated request gets a 401 because the secret variables resolve to empty strings, and Prism rejects an empty `X-API-Key`. The only passing request is the negative test that expects 401.

`results.json` is a one-element array (one per iteration) with `summary.totalRequests`, `summary.passedAssertions` and so on, plus a `results[]` entry per request with the full request, response and per-assertion results.

## CI

```yaml
- run: npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml &
- run: npx -y wait-on@8.0.1 tcp:127.0.0.1:4010
  # not http-get://: wait-on only accepts 2XX, and Prism answers 401 without a key.
- run: |
    cd examples/testing/bruno
    npx -y @usebruno/cli@4.1.0 run -r --env local \
      --env-var apiKey="$PARCELIO_API_KEY" \
      --env-var oauthToken="$PARCELIO_OAUTH_TOKEN" \
      --reporter-json results.json
  env:
    PARCELIO_API_KEY: demo-api-key
    PARCELIO_OAUTH_TOKEN: demo-oauth-token
```

Checked with wait-on 8.0.1 on 2026-09-02: `http-get://` and `http://` resources succeed only on a 2XX response (README: "HTTP GET returns 2XX response", https://github.com/jeffbski/wait-on#readme). Against Prism, `http-get://127.0.0.1:4010/carriers` retries on the 401 until it gives up (`Timed out waiting for: http-get://127.0.0.1:4010/carriers`), and `http://` does worse because Prism answers HEAD with 405. `tcp:127.0.0.1:4010` returns as soon as the port accepts connections, which is enough here.

## Importing the OpenAPI file instead of hand-writing

The Bruno app can import `specs/demo-api.yaml` directly (Import Collection, OpenAPI V3 File). The import code is the `@usebruno/converters` package, which the app bundles; running that package (version 0.23.0) against the spec gives the following. The desktop app's import path calls the same function: `packages/bruno-app/src/utils/importers/openapi-collection.js` imports `openApiToBruno` from `@usebruno/converters`, and the Import Collection dialog (`components/Sidebar/ImportCollectionLocation`) calls it with the chosen grouping (https://github.com/usebruno/bruno, checked 2026-09-02). The app ships whatever converters version its release was built with, so a newer app can differ in detail from the 0.23.0 output below. `bru import openapi` in CLI 4.1.0 also goes through `openApiToBruno` and produced the same eight folders and 29 requests, again without the `webhooks` entry.

What it gets right:

- 29 requests, one folder per tag, named from `summary` (or from `operationId` when there is no summary, so the undocumented `listPackages` shows up as `listPackages`).
- Collection-level auth becomes `apikey` on `X-API-Key` with value `{{apiKey}}`; requests inherit it.
- Both `servers` entries become environments with a `baseUrl` variable.
- Path parameters are pre-filled from the schema `examples` (`shp_9f3KqLm2Xa`, `car_ups`, ...). Query parameters are added with defaults (`limit=20` enabled, `cursor` disabled).
- The `createShipment` request body is the spec's `domestic` example verbatim, and operation descriptions land in each request's `docs` block.

What needs hand-editing afterwards:

- OAuth2 operations get a full `oauth2` authorization-code configuration pointing at `auth.parcelio.example.com` with `{{oauth_client_id}}` style placeholders. Against Prism (or any environment where you already hold a token) you switch these thirteen requests to `bearer` with a token variable, as this collection does.
- No `apiKey` variable is created in the environments; you add it (and mark it secret) yourself.
- Bodies for operations without a request example (`quoteRates`, `validateAddress`, `addPackage`, `schedulePickup`, ...) are skeletons generated from the schema: every string is `""`, every number `0`. Prism rejects most of them (`country` must be 2 characters, `minItems`, and so on), so each needs real values.
- The multipart `file` field of `uploadShipmentDocument` is imported as a text field, not a file field.
- The `webhooks` section (`shipmentStatusChanged`) is not imported; Bruno has no concept of an incoming webhook.
- No assertions or tests, naturally.

## Notes

- What worked cleanly: the `.bru` grammar is small and the CLI error messages point at the offending line. Folder ordering via `folder.bru` `seq`, runtime variables from `vars:post-response`, per-request auth override (`auth: bearer` / `auth: none`) and all assertion operators used here (`eq`, `in`, `matches`, `length`, `startsWith`, `isArray`, `isBoolean`, `isNumber`, `isString`, `isDefined`) behaved as documented.
- Prism artefacts to be aware of when writing assertions: Prism serves the schema example, not state. `Dispatch shipment` still returns `status: draft`; `Validate address` always reports the same `97208 -> 97209` correction; and every problem+json body carries `"status": 404` because that is the example value on the shared `Problem` schema, even on 401 and 422 responses. Assertions here check the HTTP status and body shape, not those values.
- The 422 negative test works because Prism validates the body against `ShipmentCreate` and, since the operation declares a `422` response, returns that response's example (`ValidationProblem`) rather than Prism's own generic error. Operations without a declared 422 would get Prism's `https://stoplight.io/prism/errors#UNPROCESSABLE_ENTITY` body instead.
- Secrets: `vars:secret` keeps values out of git, which is the point, but it also means the plain `bru run --env local` from the docs fails here until you add `--env-var`. The alternative is a `.env` file in the collection root and `{{process.env.PARCELIO_API_KEY}}` in the environment; that keeps the value in a gitignored file instead of a CLI flag. Checked with CLI 4.1.0 in the default Safe Mode on 2026-09-02: with `PARCELIO_API_KEY=...` in a collection-root `.env` and `apiKey: {{process.env.PARCELIO_API_KEY}}` in the environment file, `bru run --env <name>` sends the value (a test asserting `req.getHeader("X-API-Key")` passes). Without the `.env` the header goes out as the literal string `{{process.env.PARCELIO_API_KEY}}`, which Prism accepts as a key, so check the value, not the status code. Docs: https://docs.usebruno.com/secrets-management/dotenv-file.
- The Bruno docs offer the OpenCollection YAML format as an alternative to `.bru` ("Starting with Bruno 3.0.0") and say both formats can coexist in one collection (https://docs.usebruno.com/opencollection-yaml/overview); this example stays on `.bru` because the CLI docs still centre on it. Checked with CLI 4.1.0 on 2026-09-02: `bru import openapi` writes OpenCollection YAML by default (`--collection-format opencollection`, root file `opencollection.yml`), and `bru run Carriers --env <name>` on that output ran the three requests with no extra flags.
- Bruno CLI 4.1.0 prints a deprecation warning if a collection uses the old `{{$secrets.*}}` syntax; this one does not.
