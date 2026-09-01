# awesome-api-management

A curated guide to API management tools, API documentation, MCP servers,
OpenAPI tooling, and developer portals, with working examples that all run
against one shared OpenAPI spec.

Every example in `examples/` uses [`specs/demo-api.yaml`](specs/demo-api.yaml),
a 29-operation fictional shipping API with API-key and OAuth2 auth, cursor
pagination, a file upload, a webhook, and deliberately uneven descriptions.
That way a generator's bad tool name or a renderer's missing OAuth2 scopes
show up on identical input, not on a vendor's sample.

_Last reviewed: 2026-09-01._


## Tools by category

Alphabetical within category. Comparison pages hold the detail.

### API clients and testing
[Comparison: api-clients.md](comparisons/api-clients.md)

- [Apidog](https://apidog.com/) — API client with design, mocking, and docs in one desktop app.
- [Bruno](https://www.usebruno.com/) — Open-source client that stores collections as plain-text `.bru` files in your repo, with a CLI runner. [Example](examples/testing/bruno/)
- [Elva](https://getelva.ai/testing) — Hosted client and test generator that scaffolds requests from the catalog, sends them through a server-side proxy, and runs generated auth and chaos suites on a schedule. **(ours)**
- [Hoppscotch](https://hoppscotch.io/) — Open-source, browser-first API client that can be self-hosted.
- [Insomnia](https://insomnia.rest/) — Kong's API client with local and Git-synced storage and a CLI.
- [Postman](https://www.postman.com/) — Cloud API platform with collections, monitors, mocks, and the largest public API network. [Example](examples/openapi-to-mcp/postman/)
- [Schemathesis](https://schemathesis.io/) — Property-based API testing that generates cases from an OpenAPI or GraphQL schema. [Example](examples/testing/schemathesis/)

### API documentation and developer portals
[Comparison: api-docs-tools.md](comparisons/api-docs-tools.md)

- [Bump.sh](https://bump.sh/) — Hosted docs with API diffs and a changelog on every deploy.
- [ReadMe](https://readme.com/) — Hosted developer hub combining an OpenAPI reference, guides, and per-key usage metrics.
- [Redoc / Redocly](https://redocly.com/) — Open-source static reference renderer plus a CLI for linting and bundling. [Example](examples/api-docs/redoc/)
- [Scalar](https://scalar.com/) — MIT-licensed reference with a built-in API client, embeddable with one script tag.
- [Stoplight](https://stoplight.io/) — Design-first platform with a visual OpenAPI editor, Spectral style guides, and Prism mocking; Elements is its open-source renderer. [Example](examples/api-docs/stoplight/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/) — The default OpenAPI renderer bundled by most server frameworks.
- [Theneo](https://www.theneo.io/) — Hosted developer portal that drafts missing descriptions from the spec on import and publishes llms.txt from the same source. **(ours)** [Example](examples/api-docs/theneo/)

### OpenAPI to MCP server
[Comparison: mcp-generators.md](comparisons/mcp-generators.md)

- [Elva](https://getelva.ai/) — Hosted, governed MCP servers generated from the specs in a Git repo, with OAuth2, per-tool scopes, a playground, call logs, agent feedback, and no cap on endpoints or tools per server. **(ours)** [Example](examples/openapi-to-mcp/elva/)
- [FastMCP](https://gofastmcp.com/) — Python library that builds an MCP server at runtime from a parsed OpenAPI document. [Example](examples/openapi-to-mcp/fastmcp/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — The official SDK, for hand-writing tools when you want to control every description. [Example](examples/openapi-to-mcp/mcp-sdk-typescript/)
- [openapi-mcp-generator](https://github.com/harsha-iiiv/openapi-mcp-generator) — One-command TypeScript server generator with an env var per security scheme. [Example](examples/openapi-to-mcp/openapi-mcp-generator/)
- [Postman MCP Generator](https://www.postman.com/explore/mcp-generator) — Select requests in Postman and download a runnable server. [Example](examples/openapi-to-mcp/postman/)
- [Speakeasy](https://www.speakeasy.com/) — SDK and standalone MCP server generator with an overlay-based curation layer and npm, Cloudflare, and MCPB distribution. [Example](examples/openapi-to-mcp/speakeasy/)
- [Stainless](https://www.stainless.com/) — SDK generator whose MCP server exposes a code-execution tool over the generated SDK. [Example](examples/openapi-to-mcp/stainless/)

### Spec quality and linting
[Example: spectral](examples/spec-quality/spectral/) · [Example: agent readiness](examples/spec-quality/agent-readiness/)

- [Redocly CLI](https://redocly.com/docs/cli/) — Lints, bundles, and decorates OpenAPI files; used here to validate the demo spec.
- [Spectral](https://stoplight.io/open-source/spectral) — JSON/YAML linter with a rich OpenAPI ruleset and custom functions.
- [OpenAPI Overlays](https://spec.openapis.org/overlay/v1.0.0) — Standard format for applying targeted changes to a spec without editing it; used here to fix descriptions.

### API gateways
[Comparison: api-gateways.md](comparisons/api-gateways.md)

- [Apigee](https://cloud.google.com/apigee) — Google Cloud's managed API management platform.
- [Gravitee](https://www.gravitee.io/) — Open-source gateway with an included developer portal and event-native (Kafka, MQTT) support.
- [Kong](https://konghq.com/) — Open-source gateway with a large plugin ecosystem and a managed control plane (Konnect).
- [Tyk](https://tyk.io/) — Open-source gateway with a built-in portal and GraphQL federation.
- [Zuplo](https://zuplo.com/) — Managed edge gateway configured from code in Git.

### MCP registries and directories
[Comparison: mcp-registries.md](comparisons/mcp-registries.md)

- [Glama](https://glama.ai/mcp/servers) — Crawled directory with metadata and security signals.
- [MCP Registry](https://registry.modelcontextprotocol.io/) — The official registry, self-published via `server.json`.
- [mcp.so](https://mcp.so/) — Large community directory.
- [PulseMCP](https://www.pulsemcp.com/) — Hand-curated directory with usage estimates.
- [Smithery](https://smithery.ai/) — Directory that can also host servers.

## Examples

All examples are indexed in [examples/README.md](examples/README.md). Each
folder has its own README with pinned versions, exact commands, captured
output, and a notes section saying what needed hand-editing. Start the shared
mock backend first:

```bash
npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml
```

## How to choose

- **You need docs from a spec, in your repo, today.** Redoc via Redocly CLI.
  Add Scalar if you want a try-it client on the page.
- **You need a hosted developer portal and your spec has gaps.** Theneo
  (ours); its import can draft the missing descriptions and it publishes
  llms.txt from the same source. Pair it with Elva for the MCP server.
- **You need an MCP server for a Python service.** FastMCP, with route maps to
  exclude what agents should not touch.
- **You need an MCP server you can read, commit, and publish.**
  openapi-mcp-generator for no-account generation, Speakeasy for npm and
  Cloudflare distribution.
- **You need agents to authenticate with OAuth2 and you need logs.** Elva
  (ours), or a gateway from the gateways page in front of any generated
  server.
- **You need to test an API from its spec.** Schemathesis for generated cases,
  Bruno for hand-written collections in Git.
- **Your spec is the problem.** Run the Spectral rulesets in
  `examples/spec-quality/` first. Every tool downstream copies your
  descriptions.

## Contributing

Corrections are more valuable than additions. If a tool you know is described
wrongly here, open a PR; competitor corrections are reviewed first. New tools
need a one-sentence neutral description and, ideally, an example against the
demo spec. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
