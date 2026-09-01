# Agent-readiness checklist for OpenAPI specs

An OpenAPI document is turned into MCP tools by generators such as openapi-mcp-generator, FastMCP's `from_openapi`, Speakeasy, Stainless, Postman, or a hosted product like Elva. The generator maps one operation to one tool. The tool's name comes from the operationId, its description from the operation's summary and description, and its input schema from parameters and request body. The agent sees only that. It never sees your docs site, your changelog, or the sentence you wrote in `info.description` about how pagination works.

This checklist lists what an agent needs from the spec itself, why, how to check it, and how to fix it. Items marked **[rule]** are implemented in `agent-readiness.spectral.yaml`; the rest are manual or need a custom function.

The demo spec (`specs/demo-api.yaml`) is used for concrete examples throughout. Its defects are deliberate.

---

## 1. Operation descriptions that say when to use the tool and what comes back  [rule]

**Why it matters.** The description is the tool description. An agent with 29 tools chooses among them by reading these strings. `Get package.` gives it nothing the name `getPackage` did not; it cannot tell that `getShipment` already includes packages, so it will call both. A description that says "Returns the full shipment record including its packages" prevents that call.

A good description answers, in the first two sentences: what does it do, what does it return, and when should you use it instead of the neighbouring operation. State preconditions and the error they produce ("Draft shipments have no label and return `409`").

**How to check.** `agent-operation-description` (warn) requires a description of at least 40 characters. `agent-description-states-outcome` (warn) requires a third-person verb such as `Returns`, `Creates`, `Cancels` somewhere in the text. The verb list is a heuristic; extend it in the ruleset for your domain. Then read the ten worst ones by hand; the length rule cannot tell a good 40-character description from a padded one.

**How to fix.** Write the description as if the reader can see nothing else. `fixed-descriptions.yaml` in this folder is an Overlay that does this for the ten defective operations in the demo spec; compare `dispatchShipment` before (no description) and after.

## 2. operationIds that make good tool names  [rule]

**Why it matters.** Every generator derives the tool name from the operationId, some verbatim, some after converting case. `tracking_event_ingest` next to `listTrackingEvents` produces a tool list where one name looks like it came from a different API. Some MCP clients also limit tool names to `[a-zA-Z0-9_-]` and 64 characters; an operationId with dots or spaces gets mangled differently by each generator.

Good operationIds are lowerCamelCase, verb-first (`listShipments`, `cancelPickup`), unique, and under 40 characters so that a `parcelio_` prefix added by the client still fits.

**How to check.** `agent-operationid-camel-case` (warn) uses Spectral's `casing` function with `type: camel`. `spectral:oas` already requires operationIds to exist and be unique (`operation-operationId`, `operation-operationId-unique`).

**How to fix.** Rename. This is a breaking change for generated SDKs, so do it before the first SDK release, or use your generator's name-override extension rather than renaming the operationId itself.

## 3. Parameter descriptions with an example value  [rule, partly]

**Why it matters.** The agent fills in `shipmentId`, `cursor`, `carrier_id` from the parameter description and schema alone. `pattern: '^shp_[A-Za-z0-9]{8,}$'` plus `examples: [shp_9f3KqLm2Xa]` lets it recognise the id in an earlier response and reuse it; a bare `type: string` does not.

**How to check.** `agent-parameter-description` (warn) requires a description on every parameter. Checking that an example exists is done by hand in this ruleset; a rule that accepts `example`, `examples`, or `schema.examples` needs a small custom function. The demo spec passes the description rule; every path parameter also has `examples`.

**How to fix.** Add a one-sentence description and one realistic example per parameter. For enumerations, the enum is the example.

## 4. Auth that is documented per operation  [rule, partly]

**Why it matters.** The MCP server needs to know which credential to send for which tool. A global `security` block plus per-operation overrides (the demo spec's pattern: API key by default, OAuth2 with scopes on writes) is exactly what generators read. Operations with no `security` and no global default are ambiguous, and generators guess.

**How to check.** `agent-security-scheme-description` (warn) requires every security scheme to say how to obtain the credential. Whether every operation is covered is a manual check: grep for operations without `security` and confirm a root-level `security` exists. If your spec has no global default, add a Spectral rule `given: $.paths[*][get,post,...]`, `then: { field: security, function: truthy }`.

**How to fix.** Add a root `security` for the common case and override per operation. Put the scopes on the operation, not only in the scheme.

## 5. Error responses that explain how to recover

**Why it matters.** When a call fails, the agent gets the status code and body back as text. `409` with `{"title": "Conflict"}` teaches it nothing. `409` with `detail: "Shipment shp_... is in_transit and cannot be cancelled"` lets it stop retrying and tell the user. The response description in the spec ends up in the tool description on some generators, and the `Problem` schema defines what the agent can parse.

**How to check.** The sibling ruleset `../spectral/.spectral.yaml` has `parcelio-4xx-problem-json` (every 4xx is `application/problem+json`). Read the descriptions of `Conflict`, `ValidationFailed`, and `RateLimited` in `components.responses` and ask whether they say what to do next. The demo spec's do (`RateLimited`: "Retry after the number of seconds in `Retry-After`").

**How to fix.** Use RFC 9457 problem details everywhere, put the recovery action in the response description, and make `detail` specific at runtime.

## 6. Pagination an agent can follow  [rule]

**Why it matters.** An agent will stop after the first page unless the response says there is more and how to get it. Cursor pagination with `next_cursor` and `has_more` in every list response, and a `cursor` parameter whose description says "from the previous response's `next_cursor`", is followable. Offset pagination described only in `info.description` is not, because the agent never reads `info.description`.

**How to check.** `agent-list-returns-next-cursor` (warn) treats any GET with a `cursor` query parameter as a list operation and requires `next_cursor` in the 200 schema. The demo spec passes for all six list operations. Also confirm the `cursor` parameter description references `next_cursor` (manual).

**How to fix.** Standardise on one envelope (`data`, `next_cursor`, `has_more`) and reuse it through `allOf`, as the demo spec does with `Pagination`.

## 7. Idempotency for anything the agent might retry  [rule, hint level]

**Why it matters.** Agents retry on timeouts. A `POST /shipments` retried without an idempotency key creates two shipments and buys two labels. `createShipment` accepts `Idempotency-Key`; `addPackage`, `schedulePickup`, `createWebhookSubscription`, and `uploadShipmentDocument` do not.

**How to check.** `agent-create-idempotency-key` (hint) flags POST operations that return 201 and have no `Idempotency-Key` parameter. It is a hint, not a warning, because whether duplicates are harmful depends on the resource.

**How to fix.** Accept `Idempotency-Key` on every creating POST, or make the operation naturally idempotent (PUT with a client-chosen id).

## 8. No binary responses in the tool surface  [rule, info level]

**Why it matters.** A tool result is text or structured JSON. `getShipmentLabel` returns `application/pdf` or `image/png`; a generator will either base64 the body into the context window, return garbage, or fail. None helps the agent.

**How to check.** `agent-binary-response` (info) flags response media types `application/pdf`, `application/octet-stream`, `application/zip`, `image/*`, `audio/*`, `video/*`. The demo spec has exactly one such operation.

**How to fix.** Exclude the operation from the tool surface (FastMCP `RouteMap` with `MCPType.EXCLUDE`, or your generator's equivalent), expose it as an MCP resource, or add a JSON alternative that returns a signed download URL, as `Document.download_url` already does.

## 9. Tags that describe a group  [rule]

**Why it matters.** Tags are the only grouping an agent or a generator's route filter can use. "Show me the tracking tools" needs `Tracking` to be a tag with a description, not a naming convention.

**How to check.** `agent-tag-description` (warn) requires every root-level tag to have a description. `spectral:oas` checks that operations only use declared tags.

**How to fix.** Declare every tag at the root with one sentence.

## 10. Request body examples for POST, PUT, PATCH  [rule]

**Why it matters.** The agent constructs the request body from the JSON schema. Nested objects (`ship_from.postal_code`, `packages[].weight.unit`) are where it goes wrong: it invents field names, sends numbers as strings, or omits required nested keys. One complete example anchors it. `createShipment` has one; the other eight body-taking operations in the demo spec do not.

**How to check.** `agent-request-body-example` (warn) requires `example` or `examples` on each request body media type, or `example`/`examples` on its schema.

**How to fix.** Add one named example per media type. Reuse it in your docs and tests so it stays correct.

## 11. Size of the tool surface

**Why it matters.** Every tool definition is sent to the model on every turn. 29 tools with 100-word descriptions is a few thousand tokens per call, and choice accuracy drops as the list grows. Internal operations (`tracking_event_ingest` is for carrier integrations), admin operations, and binary downloads should not be tools by default.

**How to check.** `score.mjs` prints the operation count (`Operations (candidate tools): 29`). Decide which of them a user of the agent would ever ask for. There is no lint rule for judgement.

**How to fix.** Filter at generation time (route maps, tag filters, `x-*` extensions your generator understands) rather than deleting operations from the spec. Group by tag so filtering is one line.

## 12. Things that are not in the spec and never will be

Rate limits per plan, whether calls cost money, what happens on partial failure in a batch: an agent needs to know these and the spec has no field for them. Put them in the operation description of the operations they affect ("This endpoint is rate-limited more strictly than the rest of the API", as `getTrackingByNumber` does), because the description is the only place the agent looks.

---

## Running the checkable subset

```sh
npx -y @stoplight/spectral-cli@6.16.3 lint -r examples/spec-quality/agent-readiness/agent-readiness.spectral.yaml specs/demo-api.yaml
```

See `README.md` in this folder for the real output, the per-operation score, and the before/after with the Overlay applied.
