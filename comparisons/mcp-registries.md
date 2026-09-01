# MCP registries and directories compared: official MCP Registry, Smithery, Glama, PulseMCP, mcp.so

_Last reviewed: 2026-09-01._

This page compares five places where MCP servers get listed so that clients, agents, and people can find them: the official MCP Registry run by the Model Context Protocol project, and four independent directories. Facts were checked against each site's own docs, GitHub repository, or live API on the review date. Server counts change daily and are given only where a site displayed them on the review date. Out of scope: private or enterprise-internal MCP catalogs, client-side "marketplaces" bundled into a single IDE, and general package registries (npm, PyPI) that happen to host MCP server code.

## Summary table

| Directory | Who runs it | How servers get listed | Hosting | Metadata and quality signals | API access |
|---|---|---|---|---|---|
| Glama (glama.ai/mcp/servers) | Glama LLC, a Wyoming (US) limited liability company per its terms of service, founded by Frank Fiegel (source: https://glama.ai/policies/terms-of-service, 2026-09-02) | Indexed from public GitHub repositories, plus an "Add Server" submission and a "Claimed" state for maintainers (3,466 claimed on the review date) | Yes: separate MCP Hosting and MCP Gateway products; the directory itself lists servers | Displayed 81,382 servers on 2026-09-01; per-server license, letter grades for license, quality, and maintenance, last-update time, in-browser inspector | `GET https://glama.ai/api/mcp/v1/servers` and `/servers/{owner}/{name}`; unauthenticated calls returned HTTP 401 on the review date; the error body points to glama.ai/settings/api-keys for key creation and says use of the data is governed by Glama's API Data License, which requires visible attribution to Glama wherever the data is shown; the 401 response carried `ratelimit-limit: 100` and `ratelimit-reset: 1` headers, and no rate-limit figure is published; reference at glama.ai/mcp/reference (bearer token; server, connector, instance, telemetry, and model endpoints) |
| mcp.so | ChatMCP (GitHub org `chatmcp`, maintainer idoubi); site source `chatmcp/mcpso` is Apache-2.0 | Submit a link through the site's `/submit` form or GitHub issue #1 ("Leave your MCP Servers links"); public GitHub servers only | No; listing only | Directory entries show name, author, description, category, tags, GitHub star count, and date added; no scan, health, or usage fields were visible on 2026-09-02 | None: no API is documented on the site or in the `chatmcp/mcpso` README, and `mcp.so/api` returned HTTP 404 on 2026-09-02 |
| Official MCP Registry (registry.modelcontextprotocol.io) | The Model Context Protocol project; docs name Anthropic, GitHub, PulseMCP, and Microsoft as backing contributors. Status: preview, with the v0.1 API frozen | Self-publish: `mcp-publisher init`, `login`, `publish` with a `server.json`; namespace `io.github.<user>/*` via GitHub OAuth or OIDC, reverse-DNS `com.example/*` via DNS TXT or `/.well-known/mcp-registry-auth` | No; metadata only. Packages stay on npm, PyPI, NuGet, crates.io, OCI registries, or GitHub/GitLab releases (MCPB) | Namespace ownership proof and package ownership proof (`mcpName` in package.json, `mcp-name:` in README, OCI label); no security scanning (delegated to package registries and aggregators); `status` field can become `deprecated` or `deleted` | Unauthenticated read: `GET /v0.1/servers` with `limit`, `cursor`, `updated_since`, `search`; `/v0.1/servers/{name}/versions[/{version}]`; OpenAPI spec published for subregistries |
| PulseMCP (pulsemcp.com) | Tadas Antanavicius and Mike Coughlin; Tadas sits on the MCP steering committee and helps maintain the official registry | Curated ingestion; on the review date the site said "New server submissions and listing changes are paused ... while we rework our ingestion and listing management processes" | No; listing only | Displayed 21,982 servers on 2026-09-01; badges for official, community, and Anthropic reference servers; estimated weekly visitors; release date; "Remote Available" filter | Sub-Registry API at `https://api.pulsemcp.com/v0.1/servers` implementing the official registry spec with `_meta["com.pulsemcp/server"]` extensions (`visitorsEstimateLastFourWeeks`, `isOfficial`); `X-API-Key` header; 200 requests per minute, 5,000 per hour, 10,000 per day; access by contacting hello@pulsemcp.com |
| Smithery (smithery.ai) | Smithery AI; smithery.ai/about names Henry Mao and Anirudh Kamath and gives no founding date; Mao's own post says he started Smithery in December 2024 (source: https://x.com/Calclavia/status/1912233083501441504, 2026-09-02) | Self-publish at smithery.ai/new with a public HTTPS Streamable HTTP URL, or upload an MCPB bundle for local stdio servers; Smithery scans the server to extract tools, prompts, and resources, or reads `/.well-known/mcp/server-card.json` | Yes: servers can run on Smithery infrastructure (`isDeployed` and `smitheryManaged` fields), and a gateway handles protocol compliance and caching | `useCount` (connection count), `verified` (official-vendor verification checklist), `isDeployed`, `remote` | `GET https://api.smithery.ai/servers` with bearer API key; `q` semantic search, `page`, `pageSize` up to 100, filters `verified`, `isDeployed`, `remote`, `namespace`; `@smithery/registry` 0.7.2 SDK; `@smithery/cli` 4.11.1 installs servers. Pricing on 2026-09-02 (https://smithery.ai/pricing): Hobby free with 50K RPCs per month and 3 namespaces; Pay as you Go $10 per month with 100K RPCs, then $0.10 per 1K; Custom with an uptime SLA. The page prices connections through Smithery (managed OAuth, persistent connections) and does not list a separate hosting fee |

## Tool notes

**Glama** is best at breadth and inspection: it indexes tens of thousands of GitHub repositories, grades each on license, quality, and maintenance, and lets you open a server in a browser inspector before installing. The limitation is that the index is crawl-driven, so a large share of entries are unclaimed forks or abandoned repositories, and the directory API needs a key.

**mcp.so** is best as a low-friction, Apache-2.0 community list where a GitHub link in an issue gets you listed. The limitation is that it publishes no verification, health, or usage signals and no documented API, so it is a place to be found by people rather than by programs.

**The official MCP Registry** is best as the single upstream where you prove you own a namespace and a package, so every downstream directory can trust the `name` to `npm package` mapping. The limitation is that it is deliberately unopinionated: no ratings, no scans, no hosting, preview status with possible data resets, and its docs say host applications should read a downstream subregistry rather than the registry itself.

**PulseMCP** is best at curation and popularity data, with official/community badges and visitor estimates that other directories do not compute, and its API speaks the official registry spec with enrichments. The limitation is that ingestion is manual and was paused at review time, and API keys are issued through a partner conversation rather than self-service.

**Smithery** is best when you want listing and hosting in one step: publish a Streamable HTTP URL and Smithery scans it, tracks connections, and can run the server for you. The limitation is that the API requires a bearer key even for search, the `useCount` metric measures Smithery-routed connections only, and hosted servers put Smithery in your request path.

## How to choose

- You are publishing a new open-source server and want it everywhere with the least work: publish to the official MCP Registry first, because PulseMCP and other aggregators poll its API and your namespace proof carries downstream.
- You ship a remote server with OAuth and want people to try it without installing anything: list on Smithery, because it verifies the endpoint, extracts the tool list, and offers hosting.
- You want your server's page to show license, quality, and maintenance grades to security-conscious buyers: claim your listing on Glama, because grades are computed from the repository itself.
- You are an official vendor and want the "official" badge that clients surface: get listed on PulseMCP and complete Smithery's vendor verification, because both display a first-party marker.
- You are building an agent that discovers servers at runtime: read the official registry `GET /v0.1/servers` (no key) for the canonical set, then enrich from PulseMCP or Smithery if you need popularity or hosting flags.
- You just want a link in a community list for people to find: open an issue on `chatmcp/mcpso`.

## Publishing to the official registry: minimal `server.json`

The registry requires `name`, `description` (1 to 100 characters), and `version`; each package entry requires `registryType`, `identifier`, and `transport`. For a hypothetical npm package `@example/parcelio-mcp` published under the GitHub namespace `io.github.example`:

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.example/parcelio-mcp",
  "description": "MCP server for the Parcelio Shipments API (shipments, tracking, pickups)",
  "version": "1.0.0",
  "repository": {
    "url": "https://github.com/example/parcelio-mcp",
    "source": "github"
  },
  "packages": [
    {
      "registryType": "npm",
      "identifier": "@example/parcelio-mcp",
      "version": "1.0.0",
      "transport": { "type": "stdio" },
      "environmentVariables": [
        {
          "name": "PARCELIO_API_KEY",
          "description": "API key sent as X-API-Key",
          "isRequired": true,
          "isSecret": true,
          "format": "string"
        }
      ]
    }
  ]
}
```

The npm package must also declare the same name in its `package.json` so the registry can verify ownership:

```json
{
  "name": "@example/parcelio-mcp",
  "version": "1.0.0",
  "mcpName": "io.github.example/parcelio-mcp"
}
```

Publish sequence: `npm publish --access public`, then `brew install mcp-publisher` (or download the release binary), `mcp-publisher init`, `mcp-publisher login github`, `mcp-publisher publish`. Verify with `curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.example/parcelio-mcp"`.

## FAQ

### How do I publish to the official MCP Registry?

Publish your package to a supported registry first (npm, PyPI, NuGet, crates.io, an OCI registry, or an MCPB file on GitHub or GitLab releases) with the ownership marker that registry type requires, such as `"mcpName": "io.github.<you>/<server>"` in `package.json` for npm. Install the `mcp-publisher` CLI (`brew install mcp-publisher` or the release tarball), run `mcp-publisher init` to generate `server.json`, then `mcp-publisher login github` and `mcp-publisher publish`. GitHub login restricts you to names starting with `io.github.<your-username>/`; for a `com.yourcompany/` namespace, prove domain ownership with a DNS TXT record `v=MCPv1; k=ed25519; p=<pubkey>` or a `/.well-known/mcp-registry-auth` file and use `mcp-publisher login dns` or `login http`.

### Do I need to list my MCP server on Smithery?

No. Smithery is one independent directory, and the official registry plus aggregators that poll it will surface your server without it. List on Smithery when you want its scan-based tool listing on a public page, the `useCount` and `verified` signals, or hosting for a Streamable HTTP server you do not want to operate yourself. Publishing there requires a public HTTPS endpoint or an MCPB bundle, and search on its API needs a bearer key.

### Which MCP directory has the most servers?

On 2026-09-01, Glama displayed 81,382 servers and PulseMCP displayed 21,982; Smithery, mcp.so, and the official registry did not show a total on the pages fetched. Counts are not comparable because Glama indexes every public GitHub repository it can find while PulseMCP curates, and the official registry counts only self-published entries. Check each site's listing page for the current figure.

### What happens when my MCP server changes?

In the official registry each publish creates an immutable version, so you bump `version` in `server.json` (and in the package) and run `mcp-publisher publish` again; clients ask for `latest` or a specific version, and you can mark old versions `deprecated`. Aggregators such as PulseMCP poll `GET /v0.1/servers?updated_since=<timestamp>` and pick up the new version on their next run, typically within hours. Smithery re-scans your endpoint on publish, and Glama rebuilds from the repository, so a changed tool list on those sites depends on their crawl or your republish.

### Does the official registry scan servers for security problems?

No. Its docs state that security scanning is delegated to the underlying package registries (npm, PyPI, Docker Hub) and to downstream aggregators, and that the registry itself focuses on namespace authentication and metadata hosting. Its spam controls are namespace ownership proof, field length limits, and manual takedowns under a moderation policy. If you need scan results, look at an aggregator that publishes them in its `_meta` extension.

### Can I run my own MCP registry?

The official registry publishes an OpenAPI spec that any subregistry can implement, and PulseMCP's API is an example of that spec with vendor extensions under `_meta`. The official codebase itself is described by its maintainers as not designed for self-hosting and unsupported if forked. For private servers, which the official registry does not accept, implement the spec on your own service and point your clients at it.

### Can a client discover servers programmatically without an API key?

Yes, from the official registry: `GET https://registry.modelcontextprotocol.io/v0.1/servers?limit=100` is unauthenticated, paginates with `cursor`, and supports `search` and `updated_since`. Smithery, Glama, and PulseMCP all require a key for their APIs, and mcp.so has no documented API. The registry's own guidance is that host applications should read a subregistry that adds curation rather than the upstream directly.
