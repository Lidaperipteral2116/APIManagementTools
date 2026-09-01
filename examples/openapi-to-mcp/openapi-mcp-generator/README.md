# openapi-mcp-generator: one command, 29 tools, then the hand edits

**What this shows:** what `openapi-mcp-generator` 4.0.1 produces from `specs/demo-api.yaml` with no configuration (committed unchanged in `generated/`), a smoke test that drives the built server over stdio, and a small, re-applicable set of description edits in `patches/` for the operations the spec under-documents.

Files:

| Path | Purpose |
| --- | --- |
| `generated/` | Exact generator output. Only `node_modules/` and `build/` are ignored (the generator's own `.gitignore`). `package-lock.json` is from our `npm install` and is kept so the resolved versions below are reproducible. |
| `generated/src/index.ts` | The whole server: 29 tool definitions, security scheme table, axios call, OAuth2 helpers. 1084 lines. |
| `generated/.env.example` | `API_BASE_URL`, `API_KEY_APIKEYAUTH`, `OAUTH_TOKEN_OAUTH2`, plus `PORT`/`LOG_LEVEL` for the HTTP transports. |
| `generated/docs/oauth2-configuration.md` | Generator-written notes on the OAuth2 env vars. |
| `patches/descriptions.json` | Tool name -> replacement description, 10 entries. |
| `patches/apply-edits.mjs` | Rewrites those descriptions in `generated/src/index.ts` in place (`--check` reports without writing). |
| `patches/descriptions.patch` | The same edits as a unified diff, for review or `git apply`. |
| `smoke.mjs` | Spawns `generated/build/index.js` with the MCP SDK client, lists tools, calls `listCarriers` against Prism. `--probe` also exercises the label download and multipart upload. |
| `package.json` | Wrapper scripts; pins `@modelcontextprotocol/sdk` 1.30.0 for the smoke test only. |

## Install and generate

Node 22. From the repository root:

```bash
npx -y openapi-mcp-generator@4.0.1 --input specs/demo-api.yaml --output examples/openapi-to-mcp/openapi-mcp-generator/generated --force
cd examples/openapi-to-mcp/openapi-mcp-generator
npm install                        # SDK client for smoke.mjs
npm run build:generated            # cd generated && npm install && npm run build
```

`npm run generate` runs the same generator command. Generation overwrites `generated/`; re-run `npm run apply-edits` afterwards.

Other generator flags seen in `--help`: `--transport stdio|web|streamable-http`, `--port`, `--base-url`, `--server-name`. This example uses the defaults (stdio).

## Start the mock API

From the repository root, in a second terminal:

```bash
npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml
```

## Run

```bash
cd generated
cp .env.example .env               # the server loads .env from its cwd via dotenv
# edit .env: API_BASE_URL=http://127.0.0.1:4010, API_KEY_APIKEYAUTH=demo, OAUTH_TOKEN_OAUTH2=demo
npm start                          # prestart runs the build; stdio server, logs on stderr
```

Smoke test from the example root (Prism must be running; the env defaults below are set inside `smoke.mjs`):

```bash
API_BASE_URL=http://127.0.0.1:4010 API_KEY_APIKEYAUTH=demo npm run smoke
npm run smoke:probe                # adds getShipmentLabel and uploadShipmentDocument calls
```

Apply the hand edits and rebuild:

```bash
npm run apply-edits                # or: git apply --directory=examples/openapi-to-mcp/openapi-mcp-generator patches/descriptions.patch  (from repo root)
node patches/apply-edits.mjs --check
cd generated && npm run build
```

Inspect interactively:

```bash
npx -y @modelcontextprotocol/inspector@2.4.0 node generated/build/index.js
```

Claude Desktop:

```json
{
  "mcpServers": {
    "parcelio-generated": {
      "command": "node",
      "args": ["/absolute/path/to/examples/openapi-to-mcp/openapi-mcp-generator/generated/build/index.js"],
      "env": {
        "API_BASE_URL": "http://127.0.0.1:4010",
        "API_KEY_APIKEYAUTH": "demo",
        "OAUTH_TOKEN_OAUTH2": "demo"
      }
    }
  }
}
```

## Expected output

`npm run smoke:probe` on the unedited generator output:

```
tools/list -> 29 tools
listShipments, createShipment, getShipment, cancelShipment, updateShipment, dispatchShipment, getShipmentLabel, listShipmentDocuments, uploadShipmentDocument, listPackages, addPackage, getPackage, removePackage, getTrackingByNumber, listTrackingEvents, tracking_event_ingest, listCarriers, getCarrier, listCarrierServices, quoteRates, validateAddress, schedulePickup, getPickup, cancelPickup, listWebhookSubscriptions, createWebhookSubscription, getWebhookSubscription, deleteWebhookSubscription, testWebhookSubscription
dispatchShipment.description[0] = "Dispatch shipment"
listPackages.description[0] = "Executes GET /shipments/{shipmentId}/packages"
updateShipment.description[0] = "Update shipment."

call_tool listCarriers {limit: 2} ->
API Response (Status: 200):
{
  "data": [
    {
      "id": "car_ups",
      "name": "UPS",
      "enabled": true,
      "countries": [
        "st"
      ],
      "tracking_url_template": "https://www.ups.com/track?tracknum={tracking_number}"
    }
  ],
  "next_cursor": "eyJpZCI6InNocF85ZjNLcUxtMlhhIn0",
  "has_more": true
}

[probe] call_tool getShipmentLabel {shipmentId: shp_9f3KqLm2Xa} ->
API Error: Status 406 (Not Acceptable). Response: {"type":"https://stoplight.io/prism/errors#NOT_ACCEPTABLE","title":"The server cannot produce a representation for your accept header","status":406,"detail":"Unable to find content for application/jso...

[probe] call_tool uploadShipmentDocument {shipmentId, requestBody: '<string>'} ->
API Error: Status 415 (Unsupported Media Type). Response: {"type":"https://api.parcelio.example.com/problems/not-found","title":"Shipment not found","status":404,"detail":"string","instance":"http://example.com"}

OK
```

(The 415 body says "Shipment not found" because Prism answers every `application/problem+json` response with the same `Problem` example from the spec.)

After `npm run apply-edits && (cd generated && npm run build)`, the same three lines read:

```
dispatchShipment.description[0] = "Purchases the label and hands a draft shipment to the carrier. The shipment moves from `draft` to `dispatched`, gets a tracking number, and its packages become frozen. Returns 409 if the shipment is not a draft, and 402 if the account balance cannot cover the label. International shipments need a `commercial_invoice` document first. Requires OAuth2 scope shipments:write."
listPackages.description[0] = "Lists the packages that belong to one shipment, oldest first, with cursor pagination. Each package carries weight, dimensions and, after dispatch, its own tracking number."
updateShipment.description[0] = "Changes the mutable fields of a draft shipment: reference, service_code, ship_to address, label_format and metadata. Sender address and packages cannot be changed here (use addPackage / removePackage). Returns 409 once the shipment is dispatched. Requires OAuth2 scope shipments:write."
```

## What the generator did with the spec

**Tool names.** One tool per operation, named exactly by `operationId`, all 29 of them including the webhook-ingest endpoint. The `webhooks:` section of the spec (`onShipmentStatusChanged`) is ignored. The odd one out, `tracking_event_ingest`, keeps its snake_case; the generator does not normalise names. There is no exclude or rename option on the CLI; you edit `src/index.ts` or delete entries from `toolDefinitionMap`.

**Descriptions.** `description`, else `summary`, else `Executes <METHOD> <path>`, always followed by `\n\n(Tags: <tag>)`. So the five operations with no description but a summary get that summary (`Dispatch shipment`, `Remove package`, `Ingest tracking event`, `Cancel pickup`, `Send test event`), `listPackages` (no summary either) gets `Executes GET /shipments/{shipmentId}/packages`, and the four thin ones pass through unchanged (`Update shipment.`, `Get package.`, `Returns a carrier.`, `Get a webhook.`). No warning is printed for any of them.

**Input schema.** Path, query and header parameters become top-level properties (`shipmentId`, `limit`, `cursor`, and for `createShipment` a property literally named `Idempotency-Key`). A JSON request body becomes one `requestBody` object property carrying the full schema with `$ref`s inlined, so `description`, `enum`, `pattern`, `examples` all reach the model. At call time the JSON Schema is converted to a zod schema with `json-schema-to-zod` and evaluated with `eval` (line 1075), then `parse`d.

**The two security schemes.** The generator reads `components.securitySchemes` and derives env var names from the scheme names:

| Scheme | Type | Env var | Applied as |
| --- | --- | --- | --- |
| `ApiKeyAuth` | apiKey, header `X-API-Key` | `API_KEY_APIKEYAUTH` | `x-api-key: <value>` header |
| `OAuth2` | oauth2, authorizationCode | `OAUTH_TOKEN_OAUTH2` | `authorization: Bearer <value>` header |

Each tool carries its own `securityRequirements` (`[{"ApiKeyAuth":[]}]` for the 16 reads, `[{"OAuth2":["shipments:write"]}]` and so on for the 13 writes), and the server picks the first requirement whose env vars are present. If none are, it logs `Tool 'X' requires security: [OAuth2 (scopes: shipments:write)], but no suitable credentials found.` to stderr and sends the request anyway, unauthenticated. `OAUTH_CLIENT_ID_OAUTH2` / `OAUTH_CLIENT_SECRET_OAUTH2` exist for automatic token acquisition, but only for `clientCredentials` or `password` flows; this spec declares `authorizationCode`, so only a pre-acquired `OAUTH_TOKEN_OAUTH2` works. Nothing in the tool descriptions tells the model which credential a tool needs; the scopes are logged to stderr after the fact.

**Multipart upload (`uploadShipmentDocument`).** The `multipart/form-data` body collapses to `"requestBody": {"type": "string", "description": "Request body (content type: multipart/form-data)"}`. The `file`, `type` and `description` fields from the spec are gone. At call time the string is sent as-is with `content-type: multipart/form-data` and no boundary, which Prism rejects with 415 (see the probe output). Making this work means replacing that branch of `executeApiTool` with a `FormData` build; the generator has no hook for it.

**Binary label (`getShipmentLabel`).** The tool exists with the right description and `shipmentId` parameter, but `executeApiTool` hard-codes `Accept: application/json` (line 720) for every request. The spec offers only `application/pdf` and `image/png`, so Prism answers 406. A real server that ignores `Accept` would return PDF bytes, which axios would decode as a string and the server would paste into a text content block. Either way, no `resource` or blob content is produced.

**Base URL.** The first entry of `servers` (`https://api.parcelio.example.com/v1`, which does not resolve) is baked in as the default; `API_BASE_URL` overrides it at runtime, and `--base-url` at generation time. The generator prints `Multiple servers found. Using first` and moves on.

**Runtime.** The generated code uses the low-level `Server` class from `@modelcontextprotocol/sdk` with `setRequestHandler(ListToolsRequestSchema | CallToolRequestSchema)`, not `McpServer`/`registerTool`. `package.json` declares `@modelcontextprotocol/sdk ^1.10.0`, `axios ^1.9.0`, `zod ^3.24.3`, `json-schema-to-zod ^2.6.1`; on 2026-09-01 `npm install` resolved these to sdk 1.30.0, axios 1.20.0, zod 3.25.76. Every response is returned as one text block prefixed `API Response (Status: NNN):`; there is no `structuredContent` and no `isError` flag on failures (errors come back as ordinary text starting with `API Error:`).

## What needed hand edits

Only descriptions, and only because the spec has holes. `patches/descriptions.json` covers:

- 6 operations with no description: `dispatchShipment`, `listPackages`, `removePackage`, `tracking_event_ingest`, `cancelPickup`, `testWebhookSubscription` (`listPackages` also lacks a summary).
- 4 with a useless one: `updateShipment`, `getPackage`, `getCarrier`, `getWebhookSubscription`.

Each OAuth2-only entry ends with `Requires OAuth2 scope <scope>.` because the generated server does not surface that anywhere the model can see it. `tracking_event_ingest` is described as carrier-only and left in place; deleting a tool is a one-line removal from `toolDefinitionMap` but it is a code edit, not a description edit, so it is out of scope for the patch.

`apply-edits.mjs` is keyed by tool name rather than line number so it survives regeneration (the file carries a `Generated on:` timestamp, which changes every run and would break a plain patch's context). `descriptions.patch` is provided for review and applies cleanly with `git apply --check` to the committed `generated/src/index.ts`; expect it to need regenerating after the next `npm run generate`.

Not fixed here, would need code edits in `generated/src/index.ts`:

- `Accept` header for `getShipmentLabel`.
- Multipart encoding for `uploadShipmentDocument`.
- Removing `tracking_event_ingest` for shipper-facing deployments.
- `isError` on failed calls.

## Notes

What worked cleanly: generation, `npm install`, `npm run build` and `npm start` on the first try with no edits; all 29 operations present with correct method, path template, parameters and per-tool security requirements; `.env.example` and the OAuth2 doc are generated with the right variable names; `API_BASE_URL` override works so the spec's fictional production server is harmless.

Gotchas:

- `npm start` runs `prestart: npm run build` every time. Fine for a demo, slow if a host restarts the server often.
- `dotenv.config()` loads `.env` from the process working directory, which for Claude Desktop is not the project directory. Put credentials in the host's `env` block instead.
- The server logs every request line (`Executing tool "listCarriers": GET http://...`) and every applied credential name to stderr. Hosts that surface stderr will show them.
- Argument validation via `eval` of generated zod source is a design choice worth knowing about before deploying the server somewhere untrusted input can reach the schemas. Here the schemas come from the spec at generation time, not from the client.
- `git status` inside `generated/` is clean after build only because the generated `.gitignore` covers `build/` and `node_modules/`; do not add a second `.gitignore` there or the generator's `--force` will overwrite it.
