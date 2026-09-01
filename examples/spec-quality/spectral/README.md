# Spectral ruleset for the Parcelio demo spec

**What this shows:** a `.spectral.yaml` that extends `spectral:oas` and adds six custom rules that catch the deliberate defects in `specs/demo-api.yaml` (10 thin or missing operation descriptions, one snake_case operationId, one missing summary) and enforce two conventions the spec follows everywhere (cursor pagination carries `next_cursor`, 4xx responses are `application/problem+json`).

No mock server is needed; Spectral is static analysis. The other examples in this repo start Prism with `npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml` from the repo root; this one does not talk to the API.

## Files

| File | Purpose |
| --- | --- |
| `.spectral.yaml` | The ruleset. `extends: spectral:oas` plus rules prefixed `parcelio-`. |
| `fixtures/violations.yaml` | A minimal spec that breaks the two convention rules the demo spec passes, so you can see them fire. |
| `ci-snippet.yml` | A GitHub Actions job that runs the ruleset with `--fail-severity warn -f github-actions`. |

## Rules

| Rule | Severity | Function | What it checks |
| --- | --- | --- | --- |
| `parcelio-operation-description` | warn | `truthy` + `length` (min 40) | Every operation has a description of at least 40 characters. 40 was chosen because it is just long enough to rule out one-liners like `Get package.` (12 chars) and `Returns a carrier.` (18 chars) while the shortest honest description in the spec, `getPickup`, is 108. Tune it for your API. |
| `parcelio-operation-summary` | warn | `truthy` | Every operation has a summary. |
| `parcelio-operationid-camel-case` | warn | `casing` (type `camel`) | operationIds are lowerCamelCase. |
| `parcelio-security-scheme-description` | warn | `truthy` | Every `components.securitySchemes` entry has a description. |
| `parcelio-list-returns-next-cursor` | warn | `schema` | Any GET with a `cursor` parameter returns a 200 schema with `next_cursor` (directly or in an `allOf` member). |
| `parcelio-4xx-problem-json` | warn | `truthy` on `content['application/problem+json']` | Every 4xx response has an `application/problem+json` body. |

The built-in `operation-description` rule is turned off because the custom rule covers it and would otherwise double-report the six missing descriptions.

## Install and run

Requires Node 22. Run from the repo root.

```sh
npx -y @stoplight/spectral-cli@6.16.3 lint -r examples/spec-quality/spectral/.spectral.yaml specs/demo-api.yaml
```

For CI, fail on warnings and emit GitHub annotations:

```sh
npx -y @stoplight/spectral-cli@6.16.3 lint -r examples/spec-quality/spectral/.spectral.yaml --fail-severity warn -f github-actions specs/demo-api.yaml
```

To see the two convention rules fire:

```sh
npx -y @stoplight/spectral-cli@6.16.3 lint -r examples/spec-quality/spectral/.spectral.yaml examples/spec-quality/spectral/fixtures/violations.yaml
```

## Expected output

Against `specs/demo-api.yaml` (Spectral 6.16.3, 2026-09-01). Exit code 0 because the default `--fail-severity` is `error`.

```
/Users/.../APIManagementTools/specs/demo-api.yaml
 202:20  warning  parcelio-operation-description   description "description" property must be longer than 40                                                                    paths./shipments/{shipmentId}.patch.description
 249:10  warning  parcelio-operation-description   post.description "post.description" property must be truthy                                                                  paths./shipments/{shipmentId}/dispatch.post
  392:9  warning  parcelio-operation-description   get.description "get.description" property must be truthy                                                                  paths./shipments/{shipmentId}/packages.get
  392:9  warning  parcelio-operation-summary       Every operation needs a summary; docs tools and MCP generators use it as the display name.                                   paths./shipments/{shipmentId}/packages.get
 449:20  warning  parcelio-operation-description   description "description" property must be longer than 40                                                                    paths./packages/{packageId}.get.description
 461:12  warning  parcelio-operation-description   delete.description "delete.description" property must be truthy                                                              paths./packages/{packageId}.delete
 545:10  warning  parcelio-operation-description   post.description "post.description" property must be truthy                                                                  paths./tracking/events.post
 548:20  warning  parcelio-operationid-camel-case  operationIds must be lowerCamelCase (listShipments, not list_shipments). SDK and MCP generators turn them into identifiers.  paths./tracking/events.post.operationId
 600:20  warning  parcelio-operation-description   description "description" property must be longer than 40                                                                    paths./carriers/{carrierId}.get.description
 757:12  warning  parcelio-operation-description   delete.description "delete.description" property must be truthy                                                              paths./pickups/{pickupId}.delete
 831:20  warning  parcelio-operation-description   description "description" property must be longer than 40                                                                    paths./webhooks/{webhookId}.get.description
 864:10  warning  parcelio-operation-description   post.description "post.description" property must be truthy                                                                  paths./webhooks/{webhookId}/test.post

✖ 12 problems (0 errors, 12 warnings, 0 infos, 0 hints)
```

That is the complete list of deliberate defects: 10 description findings (6 `must be truthy` for the missing ones, 4 `must be longer than 40` for the one-liners), one casing finding for `tracking_event_ingest`, one summary finding for `listPackages`. `spectral:oas` itself adds nothing on this spec. `parcelio-list-returns-next-cursor` and `parcelio-4xx-problem-json` pass, as they should.

With `--fail-severity warn -f github-actions` the same 12 findings come out as annotations and the exit code is 1 (trimmed to the first three lines):

```
::warning title=parcelio-operation-description,file=specs/demo-api.yaml,col=20,endColumn=36,line=202,endLine=202::description "description" property must be longer than 40
::warning title=parcelio-operation-description,file=specs/demo-api.yaml,col=10,endColumn=53,line=249,endLine=273::post.description "post.description" property must be truthy
::warning title=parcelio-operation-description,file=specs/demo-api.yaml,col=9,endColumn=50,line=392,endLine=408::get.description "get.description" property must be truthy
...
```

Against `fixtures/violations.yaml` (the three non-`parcelio` lines come from `spectral:oas`; the fixture has no servers, contact, or tags on purpose to stay short):

```
/Users/.../examples/spec-quality/spectral/fixtures/violations.yaml
  3:1   warning  oas3-api-servers                   OpenAPI "servers" must be present and non-empty array.
  4:6   warning  info-contact                       Info object must have "contact" object.                                                                        info
  10:9  warning  operation-tags                     Operation must have non-empty "tags" array.                                                                    paths./things.get
 26:22  warning  parcelio-list-returns-next-cursor  List operation response schema has no next_cursor property.                                                    paths./things.get.responses[200].content.application/json.schema
 34:19  warning  parcelio-4xx-problem-json          Every 4xx response must be application/problem+json (RFC 9457) so clients can parse every error the same way.  paths./things.get.responses[404].content

✖ 5 problems (0 errors, 5 warnings, 0 infos, 0 hints)
```

## CI

`ci-snippet.yml` is a complete workflow: checkout, Node 22, the lint command above, and a second step that runs the ruleset against the fixture and inverts the exit code so a ruleset edit that silently stops firing is caught. Copy it to `.github/workflows/spec-lint.yml`.

## Notes

What worked cleanly:

- `truthy`, `length`, `casing`, and `pattern` did what the docs say. Two `then` entries in one rule (`truthy` then `length`) give one finding per operation: `length` is skipped when the field is absent, so a missing description is reported once by `truthy` and a short one once by `length`.
- `@property.match(/^4\d\d$/)` in a JSONPath filter works for selecting 4xx response keys. `@property >= '400' && @property < '500'` (string comparison) also works.

What needed hand-editing:

- JSONPath filters in Spectral run through nimma/jsep, not a JS engine. Arrow functions (`@.parameters.some(p => ...)`), `function` expressions, the `JSON` global, and nested JSONPath inside a filter all fail with `Expected comma at character N` or `'JSON' is not defined`. The "operation has a `cursor` parameter" test is therefore a positional check over `@.parameters[0..3]`, each guarded with `@.parameters[n] &&` because an unguarded `@.parameters[2].name` throws `Cannot read properties of undefined` on operations with fewer parameters. If your spec declares `cursor` later than fourth, extend the expression or move the check to a custom function.
- `[?(...)]` filters the children of the node it is applied to, so the filter has to sit at the path-item level (`$.paths[*][?(@property === 'get' && ...)]`), not after `[get]`.
- The `schema` function reports every ajv sub-error at its own instance path. An `anyOf` produced two findings for one missing `next_cursor` (one at `.schema`, one at `.schema.properties`). Wrapping the condition in `not: { not: { anyOf: [...] } }` makes ajv emit a single root-level failure, and a custom `message` replaces the unhelpful `must NOT be valid`.
- Spectral lints the `$ref`-resolved document and reports each resolved location once. Responses shared through `components.responses` are therefore reported at `components.responses.<Name>`, not at every operation that uses them. For `parcelio-4xx-problem-json` that means a bad shared response is one finding, not thirty. Inline responses (`402`, `413`, `415` in this spec) are reported at the operation.
- The built-in `operation-description` had to be switched off; otherwise each missing description appears twice.

Gotchas:

- `--fail-severity warn` makes the exit code 1 whenever there is a warning, which is what you want in CI but breaks `spectral ... | other-tool` pipelines. Use the default (`error`) when piping and inspect the output instead.
- `-f github-actions` writes the annotations and nothing else; there is no summary line. Combine with a second run in the default format if you want a human-readable log, or use `-f github-actions -f stylish` (Spectral accepts multiple `-f` when each has an `-o`).
