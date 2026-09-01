# Agent-readiness: is this spec usable by an LLM agent through MCP?

**What this shows:** a checklist of what an OpenAPI spec needs before a generator turns it into MCP tools, a Spectral ruleset that checks the mechanical subset, a script that scores the result per operation, and an OpenAPI Overlay that fixes the demo spec's ten bad descriptions so you can see the before and after.

No mock server is needed; everything here is static analysis. The other examples in this repo start Prism with `npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml` from the repo root; this one does not talk to the API.

## Files

| File | Purpose |
| --- | --- |
| `CHECKLIST.md` | Twelve items: why each matters for an agent, how to check it, how to fix it. |
| `agent-readiness.spectral.yaml` | Spectral ruleset implementing the checkable items. Extends nothing; run `spectral:oas` separately for validity. |
| `score.mjs` | Node 22, no dependencies. Reads Spectral JSON output and prints a per-operation table and a percentage. |
| `fixed-descriptions.yaml` | OpenAPI Overlay 1.0.0 that adds descriptions to the ten defective operations (and a summary to `listPackages`). Changes nothing else. |
| `demo-api.fixed.yaml` | `specs/demo-api.yaml` with the overlay applied. Generated; regenerate with the command below. |

## Rules

| Rule | Severity | What it checks |
| --- | --- | --- |
| `agent-operation-description` | warn | Description present and at least 40 characters. |
| `agent-description-states-outcome` | warn | Description contains a third-person verb (`Returns`, `Creates`, `Cancels`, ...). Heuristic; the verb list is in the ruleset. |
| `agent-parameter-description` | warn | Every parameter (operation and path level) has a description. |
| `agent-security-scheme-description` | warn | Every security scheme has a description. |
| `agent-operationid-camel-case` | warn | operationId is lowerCamelCase. |
| `agent-tag-description` | warn | Every root tag has a description. |
| `agent-request-body-example` | warn | POST/PUT/PATCH body media types have `example`/`examples`, or their schema does. |
| `agent-list-returns-next-cursor` | warn | GET with a `cursor` parameter returns `next_cursor`. |
| `agent-binary-response` | info | Response media type is PDF, image, audio, video, zip, or octet-stream. |
| `agent-create-idempotency-key` | hint | POST returning 201 accepts an `Idempotency-Key` parameter. |

## Install and run

Requires Node 22. Run everything from the repo root.

Lint:

```sh
npx -y @stoplight/spectral-cli@6.16.3 lint -r examples/spec-quality/agent-readiness/agent-readiness.spectral.yaml specs/demo-api.yaml
```

Score (pipe Spectral's JSON output into the script; the spec path is needed to count operations that have no findings):

```sh
npx -y @stoplight/spectral-cli@6.16.3 lint -q -f json -r examples/spec-quality/agent-readiness/agent-readiness.spectral.yaml specs/demo-api.yaml \
  | node examples/spec-quality/agent-readiness/score.mjs --spec specs/demo-api.yaml
```

`score.mjs` counts warnings and errors by default; `--min-severity hint` counts everything. It also accepts a results file instead of stdin.

Apply the overlay to produce the fixed copy:

```sh
npx -y bump-cli@2.10.1 overlay specs/demo-api.yaml examples/spec-quality/agent-readiness/fixed-descriptions.yaml -o examples/spec-quality/agent-readiness/demo-api.fixed.yaml
```

Then lint and score the fixed copy:

```sh
npx -y @stoplight/spectral-cli@6.16.3 lint -r examples/spec-quality/agent-readiness/agent-readiness.spectral.yaml examples/spec-quality/agent-readiness/demo-api.fixed.yaml
npx -y @stoplight/spectral-cli@6.16.3 lint -q -f json -r examples/spec-quality/agent-readiness/agent-readiness.spectral.yaml examples/spec-quality/agent-readiness/demo-api.fixed.yaml \
  | node examples/spec-quality/agent-readiness/score.mjs --spec examples/spec-quality/agent-readiness/demo-api.fixed.yaml
```

## Expected output

### Lint, before (specs/demo-api.yaml)

28 findings: 22 warnings, 2 infos, 4 hints. Trimmed to one example per rule; the full list is what `score.mjs` summarises below.

```
 202:20      warning  agent-description-states-outcome  Description should state what the operation does or returns ("Returns ...", "Creates ...", "Cancels ...").                       paths./shipments/{shipmentId}.patch.description
 202:20      warning  agent-operation-description       description "description" property must be longer than 40                                                                        paths./shipments/{shipmentId}.patch.description
 208:28      warning  agent-request-body-example        Request body application/json has no example or examples (media type or schema level).                                           paths./shipments/{shipmentId}.patch.requestBody.content.application/json
 249:10      warning  agent-operation-description       post.description "post.description" property must be truthy                                                                      paths./shipments/{shipmentId}/dispatch.post
 291:29  information  agent-binary-response             Binary response media type application/pdf; exclude this operation from the tool surface or expose it as a resource.             paths./shipments/{shipmentId}/label.get.responses[200].content.application/pdf
 333:10         hint  agent-create-idempotency-key      POST returning 201 has no Idempotency-Key parameter; retries by an agent may create duplicates.                                  paths./shipments/{shipmentId}/documents.post
 548:20      warning  agent-operationid-camel-case      operationIds become tool names. Keep them lowerCamelCase so generated names are consistent (listShipments, not list_shipments).  paths./tracking/events.post.operationId
...
✖ 28 problems (0 errors, 22 warnings, 2 infos, 4 hints)
```

Breakdown by rule: `agent-operation-description` 10 (the deliberate defects), `agent-description-states-outcome` 3 (`Update shipment.`, `Get package.`, `Get a webhook.`; the six missing descriptions cannot fail a pattern check), `agent-request-body-example` 8 (every body-taking operation except `createShipment`), `agent-operationid-camel-case` 1, `agent-binary-response` 2 (PDF and PNG on `getShipmentLabel`), `agent-create-idempotency-key` 4. `agent-parameter-description`, `agent-security-scheme-description`, `agent-tag-description`, and `agent-list-returns-next-cursor` pass.

### Score, before

```
Agent-readiness findings for specs/demo-api.yaml (severity warn and above; 22 of 28 findings counted)

Method  Path                               operationId                Failing rules
------  ---------------------------------  -------------------------  -----------------------------------------------------------------------------------------
GET     /shipments                         listShipments              -
POST    /shipments                         createShipment             -
GET     /shipments/{shipmentId}            getShipment                -
PATCH   /shipments/{shipmentId}            updateShipment             agent-description-states-outcome, agent-operation-description, agent-request-body-example
DELETE  /shipments/{shipmentId}            cancelShipment             -
POST    /shipments/{shipmentId}/dispatch   dispatchShipment           agent-operation-description
GET     /shipments/{shipmentId}/label      getShipmentLabel           -
GET     /shipments/{shipmentId}/documents  listShipmentDocuments      -
POST    /shipments/{shipmentId}/documents  uploadShipmentDocument     agent-request-body-example
GET     /shipments/{shipmentId}/packages   listPackages               agent-operation-description
POST    /shipments/{shipmentId}/packages   addPackage                 agent-request-body-example
GET     /packages/{packageId}              getPackage                 agent-description-states-outcome, agent-operation-description
DELETE  /packages/{packageId}              removePackage              agent-operation-description
GET     /tracking/{trackingNumber}         getTrackingByNumber        -
GET     /shipments/{shipmentId}/events     listTrackingEvents         -
POST    /tracking/events                   tracking_event_ingest      agent-operation-description, agent-operationid-camel-case, agent-request-body-example
GET     /carriers                          listCarriers               -
GET     /carriers/{carrierId}              getCarrier                 agent-operation-description
GET     /carriers/{carrierId}/services     listCarrierServices        -
POST    /rates                             quoteRates                 agent-request-body-example
POST    /addresses/validate                validateAddress            agent-request-body-example
POST    /pickups                           schedulePickup             agent-request-body-example
GET     /pickups/{pickupId}                getPickup                  -
DELETE  /pickups/{pickupId}                cancelPickup               agent-operation-description
GET     /webhooks                          listWebhookSubscriptions   -
POST    /webhooks                          createWebhookSubscription  agent-request-body-example
GET     /webhooks/{webhookId}              getWebhookSubscription     agent-description-states-outcome, agent-operation-description
DELETE  /webhooks/{webhookId}              deleteWebhookSubscription  -
POST    /webhooks/{webhookId}/test         testWebhookSubscription    agent-operation-description

Operations (candidate tools): 29
Operations with zero findings: 13/29 (45%)

Note: the percentage is a heuristic. It counts operations with no lint findings at or above the threshold.
It does not measure whether descriptions are accurate or whether the tool surface is the right size.
```

`getShipmentLabel` shows as clean because the binary-response finding is `info`. With `--min-severity hint` the figure is 12/29 (41%).

### Applying the overlay

```
* Let's apply the overlay to the main definition... done
```

`demo-api.fixed.yaml` differs from the original in exactly 11 leaf values: ten `description`s and one `summary` (checked by parsing both files and diffing the object trees). bump-cli re-serialises the whole document, so a textual diff is noisy (2109 lines versus 1855) even though nothing else changed. `redocly lint` validates both the overlay file and the result.

### Lint, after (demo-api.fixed.yaml)

```
 220:28      warning  agent-request-body-example    Request body application/json has no example or examples (media type or schema level).                                           paths./shipments/{shipmentId}.patch.requestBody.content.application/json
 313:29  information  agent-binary-response         Binary response media type application/pdf; exclude this operation from the tool surface or expose it as a resource.             paths./shipments/{shipmentId}/label.get.responses[200].content.application/pdf
 318:23  information  agent-binary-response         Binary response media type image/png; exclude this operation from the tool surface or expose it as a resource.                   paths./shipments/{shipmentId}/label.get.responses[200].content.image/png
 355:10         hint  agent-create-idempotency-key  POST returning 201 has no Idempotency-Key parameter; retries by an agent may create duplicates.                                  paths./shipments/{shipmentId}/documents.post
 371:31      warning  agent-request-body-example    Request body multipart/form-data has no example or examples (media type or schema level).                                        paths./shipments/{shipmentId}/documents.post.requestBody.content.multipart/form-data
 440:10         hint  agent-create-idempotency-key  POST returning 201 has no Idempotency-Key parameter; retries by an agent may create duplicates.                                  paths./shipments/{shipmentId}/packages.post
 456:28      warning  agent-request-body-example    Request body application/json has no example or examples (media type or schema level).                                           paths./shipments/{shipmentId}/packages.post.requestBody.content.application/json
 592:20      warning  agent-operationid-camel-case  operationIds become tool names. Keep them lowerCamelCase so generated names are consistent (listShipments, not list_shipments).  paths./tracking/events.post.operationId
 599:28      warning  agent-request-body-example    Request body application/json has no example or examples (media type or schema level).                                           paths./tracking/events.post.requestBody.content.application/json
 712:28      warning  agent-request-body-example    Request body application/json has no example or examples (media type or schema level).                                           paths./rates.post.requestBody.content.application/json
 740:28      warning  agent-request-body-example    Request body application/json has no example or examples (media type or schema level).                                           paths./addresses/validate.post.requestBody.content.application/json
 755:10         hint  agent-create-idempotency-key  POST returning 201 has no Idempotency-Key parameter; retries by an agent may create duplicates.                                  paths./pickups.post
 771:28      warning  agent-request-body-example    Request body application/json has no example or examples (media type or schema level).                                           paths./pickups.post.requestBody.content.application/json
 858:10         hint  agent-create-idempotency-key  POST returning 201 has no Idempotency-Key parameter; retries by an agent may create duplicates.                                  paths./webhooks.post
 875:28      warning  agent-request-body-example    Request body application/json has no example or examples (media type or schema level).                                           paths./webhooks.post.requestBody.content.application/json

✖ 15 problems (0 errors, 9 warnings, 2 infos, 4 hints)
```

### Before and after

| | Findings | Warnings | Operations with zero findings (warn and above) |
| --- | --- | --- | --- |
| `specs/demo-api.yaml` | 28 | 22 | 13/29 (45%) |
| `demo-api.fixed.yaml` | 15 | 9 | 21/29 (72%) |

The 13 findings that went away are the 10 description-length findings and the 3 verb-pattern findings. The overlay deliberately leaves the snake_case operationId and the missing request-body examples alone, so those 9 warnings, the 2 binary-response infos, and the 4 idempotency hints remain.

## Notes

What worked cleanly:

- `truthy`, `length`, `casing`, and `pattern` behave as documented. `pattern` is skipped when the field is absent, which is why the six operations with no description produce one finding (from `truthy`) rather than two.
- `bump-cli@2.10.1 overlay FILE OVERLAY -o OUT` applies an Overlay 1.0.0 document as specified: the `target` JSONPath selects the operation object and `update` is merged into it. Targets like `$.paths['/shipments/{shipmentId}/dispatch'].post` need the bracket-and-quotes form because of the `/` and `{}` characters.
- `redocly lint` (2.49.1) recognises an Overlay document by its `overlay: 1.0.0` field and validates its structure, which is a cheap sanity check before applying it. Redocly CLI has no command to apply an overlay, so bump-cli does that step. (The `openapi-overlays-js@0.2.0` package also has an `overlayjs --openapi F --overlay F` CLI; not used here because it prints to stdout only.)
- `score.mjs` reads either YAML or JSON specs. If your `paths` block is not plain block-style YAML, bundle to JSON first: `npx -y @redocly/cli@2.49.1 bundle specs/demo-api.yaml --ext json -o /tmp/demo-api.json` and pass that as `--spec`.

What needed hand-editing:

- The `schema` function reports each ajv sub-error at its own path. The first version of `agent-request-body-example` (an `anyOf` over media-type and schema-level examples) produced 15 findings for 8 real gaps, seven of them at `components.schemas.*` because Spectral lints the `$ref`-resolved document. Wrapping the condition in `not: { not: { anyOf: [...] } }` makes ajv emit one root-level failure and the count dropped to 8. Same fix for `agent-list-returns-next-cursor`.
- Spectral's JSONPath filters (nimma/jsep) have no arrow functions, no `JSON` global, and no nested paths, so "has a parameter named `cursor`" is a positional check over `@.parameters[0..3]`. See `../spectral/README.md` for the details.
- The verb list in `agent-description-states-outcome` was built from the demo spec's good descriptions. It is a heuristic and will need words added for other domains. It cannot catch a description that starts with `Returns` and then says nothing useful; that is what reading the ten worst descriptions by hand is for.

Gotchas:

- `agent-binary-response` produces one finding per media type, so `getShipmentLabel` (PDF and PNG) shows twice. The per-operation table de-duplicates by rule name.
- `score.mjs` attributes findings to operations by the first three elements of Spectral's `path` (`paths`, `/x`, `get`). Findings reported at `components.*` or `webhooks.*` are listed separately under "not attributable" rather than being counted against an operation. With this ruleset and this spec there are none.
- Percentages here mean "no lint findings", nothing more. A spec can score 100% and still describe an API no agent can use well; see items 11 and 12 in `CHECKLIST.md`.
