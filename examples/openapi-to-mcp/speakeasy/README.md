# Speakeasy: OpenAPI to standalone TypeScript MCP server

**What this shows:** generating a standalone TypeScript MCP server from `specs/demo-api.yaml` with the Speakeasy CLI, using two OpenAPI Overlays to fix the spec's thin tool descriptions, add read/write scopes, hide the carrier-only endpoint and work around a generator limitation, then running the server against the Prism mock with `--scope read` and `--scope write`.

Speakeasy is best at turning a spec into a server you own: one tool per operation with names, descriptions, scopes and MCP annotations controlled from an overlay, a CLI with `--scope`, `--tool`, `--tool-annotations` and a `--mode dynamic` that collapses everything into four meta-tools, stdio or streamable HTTP, and an MCPB bundle for Claude Desktop. Generation needs a Speakeasy account; the output is plain TypeScript you can build and run offline.

Unlike the Stainless and Postman folders, the generated code here is real and checked in (`generated/`), because the CLI was logged in when this was written. See Notes for what needed an account or a paid tier.

## Files

| File | What it is |
|---|---|
| `workflow.yaml` | `.speakeasy/workflow.yaml` as written by `speakeasy quickstart`, plus the two overlays and a relative spec path. |
| `gen.yaml` | `.speakeasy/gen.yaml` as written by `speakeasy quickstart -t mcp-typescript`, untouched apart from two comments. |
| `overlay.yaml` | Overlay 1.0.0 document adding `x-speakeasy-mcp` (name, description, scopes, hints, disabled) to operations. |
| `overlay-bearer-auth.yaml` | Second overlay: hoists the write operations' auth into a global bearer token. Without it the generator emits 16 tools instead of 28 (see Notes). |
| `generated/` | Output of `speakeasy run` with both overlays: `src/`, `package.json`, `.speakeasy/{gen,workflow}.yaml`, Speakeasy's own README. Build artefacts (`bin/`, `esm/`, `node_modules/`) are git-ignored; `npm run build` recreates them. |
| `smoke.mjs` | 90-line stdio MCP client: initialize, tools/list, optional tools/call. Used for Expected output and CI. |
| `images/` | Screenshot slots. |

## Prerequisites

- Node 22. The generated `build` script also uses Bun, which is a devDependency; a plain `npm install` fetches it.
- Speakeasy CLI. Pin the version this was captured with:

```sh
brew install speakeasy-api/tap/speakeasy        # macOS
# or: curl -fsSL https://go.speakeasy.com/cli-install.sh | sh
speakeasy --version                              # captured with 1.796.2
```

- A Speakeasy account for `speakeasy run` (`speakeasy auth login`). Everything after generation runs without one.
- Prism mock running. From the repo root:

```sh
npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml
```

## Walkthrough

Step 1. Log in.

```sh
speakeasy auth login
```

![step 1](images/step-1.png)
<!-- MAINTAINER: add screenshot of the browser login and the CLI confirming the workspace -->

Step 2. Quickstart. Interactive:

```sh
speakeasy quickstart --mcp
```

Speakeasy's guide documents one prompt on this path: "Indicate whether you plan to deploy your server on Cloudflare" (answer no unless you want the Worker config; source: https://www.speakeasy.com/docs/standalone-mcp/build-server, 2026-09-02). The OpenAPI document (`specs/demo-api.yaml`), SDK name, package name and output directory are the same inputs the non-interactive form below passes as flags. This session ran the non-interactive form, so the wording and order of the other prompts are not recorded here.

Non-interactive, which is what produced the files in this folder:

```sh
speakeasy quickstart -t mcp-typescript -s specs/demo-api.yaml \
  -n ParcelioMCP -p parcelio-mcp -o /tmp/parcelio-mcp --skip-interactive --skip-compile
```

Either way the result is a directory with `.speakeasy/workflow.yaml` and `.speakeasy/gen.yaml`; compare with `workflow.yaml` and `gen.yaml` here.

![step 2](images/step-2.png)
<!-- MAINTAINER: add screenshot of the quickstart prompts with the Cloudflare question visible -->

Step 3. Wire in the overlays. `overlay.yaml` does three things with `x-speakeasy-mcp`: tags every GET with scope `read` and every POST/PATCH/DELETE with `write` (then flips `quoteRates` and `validateAddress` back to `read` with `readOnlyHint: true`, since they are POSTs without side effects); gives the ten operations with missing or one-line descriptions a `name` and a real `description`, with `destructiveHint` on `dispatch_shipment`, `remove_package`, `cancel_pickup` and `idempotentHint` on `update_shipment`, `test_webhook_subscription`; and sets `disabled: true` on `tracking_event_ingest`.

`overlay-bearer-auth.yaml` is explained in Notes; the short version is that operations with their own `security` block get no tool, so it moves the bearer requirement to the document level.

Validate them and look at the result before generating:

```sh
speakeasy overlay validate -o examples/openapi-to-mcp/speakeasy/overlay.yaml
speakeasy overlay apply -s specs/demo-api.yaml -o examples/openapi-to-mcp/speakeasy/overlay.yaml --strict --out /tmp/parcelio-overlaid.yaml
```

`--strict` fails if any JSONPath target matches nothing, which catches typos in paths.

The `sources` block in `workflow.yaml` lists both overlays; `speakeasy run` applies them in order.

Step 4. Generate.

```sh
cd examples/openapi-to-mcp/speakeasy/generated
speakeasy run -y --output console
```

This lints the spec, applies the overlays, generates `src/`, runs `npm install`, `npm run lint` and `npm run build`. About a minute.

![step 4](images/step-4.png)
<!-- MAINTAINER: add screenshot of the generation summary box -->

Step 5. Build from the checked-in source (no account needed).

```sh
cd examples/openapi-to-mcp/speakeasy/generated
npm install
npm run build
node bin/mcp-server.js --help
```

Do not use `npm install --ignore-scripts`; Bun's postinstall must run or `npm run build` fails with "Bun's postinstall script was not run".

Step 6. Run against Prism. Read-only tools:

```sh
node bin/mcp-server.js start --scope read \
  --server-url http://127.0.0.1:4010 \
  --api-key-auth fake-key --bearer-auth fake-token
```

Write tools: `--scope write`. All 28: omit `--scope`. The same values can come from `PARCELIOMCP_API_KEY_AUTH` and `PARCELIOMCP_BEARER_AUTH`. Both credentials are required together (Notes explain why). Other useful flags from `start --help`: `--tool <name>` (repeatable) to mount a subset, `--tool-annotations readOnly` to filter by hint, `--mode dynamic` to expose `list_tools`, `describe_tool_input`, `execute_tool`, `list_scopes` instead of individual tools, `--transport sse --port 2718`. Streamable HTTP is a separate subcommand: `node bin/mcp-server.js serve --port 2718 --disable-static-auth`.

Step 7. Smoke test it.

```sh
cd examples/openapi-to-mcp/speakeasy
CALL_TOOL='carriers-list-carriers|{"request":{"limit":2}}' node smoke.mjs generated \
  start --scope read --server-url http://127.0.0.1:4010 --api-key-auth fake-key --bearer-auth fake-token
```

Tool arguments are wrapped in a `request` object; the smoke output lists tool names.

Step 8. Connect Claude Desktop. From Speakeasy's guide, with this project's paths:

```json
{
  "mcpServers": {
    "parcelio": {
      "command": "node",
      "args": ["/absolute/path/examples/openapi-to-mcp/speakeasy/generated/bin/mcp-server.js", "start", "--scope", "read", "--server-url", "http://127.0.0.1:4010"],
      "env": {
        "PARCELIOMCP_API_KEY_AUTH": "fake-key",
        "PARCELIOMCP_BEARER_AUTH": "fake-token"
      }
    }
  }
}
```

`npm run mcpb:build` produces an `.mcpb` bundle that can be dropped onto Claude Desktop instead; its manifest is customised through `mcpbManifestOverlay` in `gen.yaml`.

![step 8](images/step-8.png)
<!-- MAINTAINER: add screenshot of Claude Desktop listing the 16 read tools -->

## Expected output

Captured 2026-09-01, macOS arm64, Node 22, speakeasy 1.796.2, Prism 5.16.0 on port 4010. Trimmed.

Overlay validation and application:

```
Overlay file "examples/openapi-to-mcp/speakeasy/overlay.yaml" is valid.
Overlay Applied Successfully
Overlay examples/openapi-to-mcp/speakeasy/overlay.yaml applied to specs/demo-api.yaml
Actions applied: 16
```

`speakeasy run -y --output console` (the two warnings are the interesting part):

```
INFO    validation hint: [line 327:7] generator-pagination - pagination might be supported by this operation - consider adding x-speakeasy-pagination extension
...
WARN    validation warn: [line 985:7] style-operation-success-response - operation onShipmentStatusChanged must define at least a single 2xx or 3xx response
WARN    unsupported: skipping webhooks: feature webhooks requires at least tier "business" - contact us to upgrade (line 955)
OpenAPI document linting complete. 0 errors, 2 warnings, 10 hints
» Generate SDK...
» Compile SDK...
» npm install --ignore-scripts...
» npm run lint...
» npm run build...
SDK for mcp-typescript generated successfully ✓
Generation Summary
⏲ Generated in 61.8 Seconds
```

Fresh `npm install && npm run build` of `generated/`:

```
added 260 packages, and audited 261 packages in 14s
> parcelio-mcp@0.3.0 build
> bun i && bun src/mcp-server/build.mts && tsc
7 packages installed [54.00ms]
$ node bin/mcp-server.js --version
0.3.0
```

`smoke.mjs` with `--scope read` and a call to `carriers-list-carriers` (with both auth flags):

```
server: {"name":"ParcelioMcp","version":"0.3.0"}
tools: 16
 - shipments-list-shipments                          List shipments Returns shipments belonging to the authentica
 - shipments-get-shipment                            Get a shipment Returns the full shipment record including it
 - shipments-get-shipment-label                      Download the shipping label Returns the carrier label for a
 - shipments-list-shipment-documents                 List shipment documents Returns customs forms, commercial in
 - list_packages                                     List the packages that belong to one shipment, with weight,
 - get_package                                       Fetch one package by id (pkg_...): weight, dimensions, decla
 - tracking-get-tracking-by-number                   Track by tracking number Looks up current status and the mos
 - tracking-list-tracking-events                     List tracking events Returns every scan event the carrier ha
 - carriers-list-carriers                            List carriers Returns the carriers available to your account
 - get_carrier                                       Fetch one carrier by id (car_ups, car_fedex, ...): whether t
 - carriers-list-carrier-services                    List carrier services Returns the service levels a carrier o
 - rates-quote-rates                    readOnly     Quote rates Returns a price and transit estimate for every e
 - addresses-validate-address           readOnly     Validate an address Checks an address against carrier and po
 - pickups-get-pickup                                Get a pickup Returns a scheduled pickup, including the carri
 - webhooks-list-webhook-subscriptions               List webhook subscriptions Returns the webhook subscriptions
 - get_webhook_subscription                          Fetch one webhook subscription: target URL, subscribed event
call carriers-list-carriers -> {"content":[{"type":"text","text":"{\"data\":[{\"id\":\"car_ups\",\"name\":\"UPS\",\"enabled\":true,\"countries\":[\"st\"],\"tracking_url_template\":\"https://www.ups.com/track?tracknum={tracking_number}\"}],\"next_cursor\":\"eyJpZCI6InNocF85ZjNLcUxtMlhhIn0\",\"has_more\":true}"}]}
```

`--scope write` with a call to `dispatch_shipment`:

```
tools: 12
 - shipments-create-shipment                         Create a shipment Creates a shipment in `draft` status from
 - update_shipment                      idempotent   Change reference, service_code, ship_to, label_format or met
 - shipments-cancel-shipment                         Cancel a shipment Cancels a shipment. Draft shipments are de
 - dispatch_shipment                    destructive  Purchase the carrier label and hand a draft shipment to the
 - shipments-upload-shipment-document                Upload a shipment document Attaches a document such as a com
 - packages-add-package                              Add a package to a shipment Adds a package to a `draft` ship
 - remove_package                       destructive  Remove a package from a draft shipment. Not allowed once the
 - pickups-schedule-pickup                           Schedule a pickup Asks a carrier to collect one or more disp
 - cancel_pickup                        destructive  Cancel a scheduled carrier pickup. Returns 409 if the driver
 - webhooks-create-webhook-subscription              Create a webhook subscription Registers an HTTPS endpoint to
 - webhooks-delete-webhook-subscription              Delete a webhook subscription Stops deliveries to the endpoi
 - test_webhook_subscription            idempotent   Send a synthetic shipment.status_changed event to a webhook
call dispatch_shipment -> {"content":[{"type":"text","text":"{\"id\":\"shp_9f3KqLm2Xa\",\"status\":\"draft\",\"reference\":\"ORDER-10422\",\"carrier_id\":\"car_ups\",\"service_code\":\"ups_ground\", ...
```

No `--scope`: `tools: 28` (29 operations minus the disabled `tracking_event_ingest`). `--mode dynamic`:

```
tools: 4
 - list_tools                           readOnly,idempotent List available tools. Optionally filter by search terms that
 - describe_tool_input                  readOnly,idempotent Get the input schema for one or more tools. It is a good ide
 - execute_tool                         destructive,openWorld Execute a tool by name with its arguments. If executing a gi
 - list_scopes                          readOnly,idempotent List the scopes available on this server. Scopes are categor
```

Streamable HTTP: `node bin/mcp-server.js serve --port 2718 --disable-static-auth` logged `MCP Streamable HTTP server started host=0.0.0.0:2718`, and a `POST /mcp` initialize returned `200` with `content-type: text/event-stream`.

## Notes

What worked cleanly:

- The whole toolchain on an OpenAPI 3.1 document: lint, overlays, generation, build. The spec's `type: [string, 'null']`, `const`, multipart body and binary responses all produced tools (`shipments-upload-shipment-document`, `shipments-get-shipment-label`) without edits.
- `x-speakeasy-mcp` did exactly what the reference says: `name` replaced the default tool name, `description` replaced summary+description, `scopes` drove `--scope`, the `*Hint` fields came through as MCP annotations (visible in the smoke output), `disabled: true` removed the tool. Nine of the ten weak descriptions from the spec were fixed this way without touching the spec; the tenth, `tracking_event_ingest`, was hidden.
- Default tool names are `<tag>-<operationId in kebab-case>` (`carriers-list-carriers`). The spec's inconsistent `tracking_event_ingest` would have become `tracking-tracking-event-ingest`; hiding it removed the question.
- Overlay `--strict` and `overlay validate` run offline and gave useful errors (a JSONPath filter expression `[?(@.security)]` is not supported and fails cleanly under `--strict`).

What needed hand-editing:

- Silent loss of 13 tools. The first generation produced 16 tools, all reads, with no warning. Every operation that carries its own `security` block (the 13 OAuth2 writes) got an SDK function under `src/funcs/` but no tool under `src/mcp-server/tools/`. Replacing the per-operation scheme with `http bearer` changed nothing; removing the per-operation `security` entirely gave 28 tools. Conclusion: the MCP layer only wires the document-level security into its CLI flags and env vars, and drops tools it cannot authenticate. `overlay-bearer-auth.yaml` therefore deletes the 13 per-operation blocks and sets the global requirement to `ApiKeyAuth` AND `BearerAuth`, which yields `--api-key-auth` and `--bearer-auth` and `PARCELIOMCP_API_KEY_AUTH` / `PARCELIOMCP_BEARER_AUTH`. Side effect: both must be supplied. With only `--api-key-auth`, even read calls come back as the mock's 401 body, because the AND requirement is treated as unmet and no credential is sent. Speakeasy's docs (read 2026-09-02) do not describe a way to keep operation-level OAuth2 in a standalone server: the standalone MCP guide's client examples pass a single `API_TOKEN` env var; "Add OAuth to an MCP Server" (https://www.speakeasy.com/docs/standalone-mcp/setting-up-oauth) is about the agent-to-server side (authorization code directly when the API supports Dynamic Client Registration, otherwise through a Speakeasy-run OAuth proxy; client credentials via `CLIENT_ID`/`CLIENT_SECRET`; or a pre-obtained `ACCESS_TOKEN`, each attached to a toolset in the Speakeasy dashboard); and the SDK OAuth page (https://www.speakeasy.com/docs/sdks/customize/authentication/oauth) says authorization-code flows need custom security schemes and hooks. The 16-versus-28 behaviour is our observation with CLI 1.796.2, not something the docs state.
- Overlay `update` appends to arrays. Setting `scopes: [read]` on top of an earlier `scopes: [write]` produced `[write, read]`; the fix in both overlays is `remove: true` on the array first. Same for `security`.
- The auth semantics changed for the generated client only. The Prism mock (and a real Parcelio) still require a bearer only on writes and a key only on reads; the server sends both on every call, which is harmless here but is a decision to make deliberately for a production API.

Gotchas:

- Account and tier. `speakeasy run` refused to run without a TTY in non-interactive mode ("could not open a new TTY") but ran under a pseudo-terminal; it needs a logged-in workspace. The run warned `skipping webhooks: feature webhooks requires at least tier "business"`, so the spec's `shipmentStatusChanged` webhook is absent from the generated SDK on the workspace used here. That is the one tier limit observed. Speakeasy's pricing page (https://www.speakeasy.com/pricing/, 2026-09-02) lists only an Enterprise plan with tailored pricing and no per-feature limits, and the webhooks guide (https://www.speakeasy.com/docs/sdks/customize/webhooks) says webhooks need a Business or Enterprise plan; no published limit specific to MCP targets was found. The generated README also carries a notice that the server "is not yet ready for production use" until a first generation action runs in the Speakeasy GitHub workflow; that is about publishing, not about running it locally.
- `generated/README.md` and `generated/.speakeasy/workflow.yaml` had the workspace slug replaced with `<org>/<workspace>`; nothing else in `generated/` was edited.
- `speakeasy run` bumps `mcp-typescript.version` in `gen.yaml` on every run (`versioningStrategy: automatic`), which is why `generated/` says 0.3.0 and the root `gen.yaml` says 0.0.1.
- Pagination: the lint hints suggest `x-speakeasy-pagination` on the five cursor-paginated list operations. Without it each list tool exposes `limit` and `cursor` as plain arguments and the agent has to pass `next_cursor` back by hand; the descriptions written in `overlay.yaml` say so for `list_packages`. It does not help here: adding `x-speakeasy-pagination` (type `cursor`, `nextCursor: $.next_cursor`) to `listShipments` in a third overlay and regenerating on 2026-09-02 (CLI 1.796.2, fetched by `speakeasyVersion: latest`) logged `x-speakeasy-pagination extension not supported in mcp-typescript clients {"operation":"listShipments"}` and emitted a byte-identical `shipmentsListShipments.ts` tool and SDK function. The extension's docs (https://www.speakeasy.com/docs/sdks/customize/runtime/pagination) describe SDK `next()` iterators and do not mention MCP.
- The `mcp-server.js` bundle is 2.1 MB plus a 3.7 MB source map; it is not checked in.

Pinned versions: speakeasy CLI 1.796.2 (the workflow sets `speakeasyVersion: latest`, and `speakeasy run` downloaded 1.796.2 on 2026-09-01; the locally installed binary can be older, as it was here, without affecting the output), `@stoplight/prism-cli@5.16.0`, generated `package.json` pins `@modelcontextprotocol/sdk` 1.26.0 and `typescript` ~5.8.3.
