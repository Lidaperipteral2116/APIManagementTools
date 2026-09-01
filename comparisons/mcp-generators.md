# OpenAPI to MCP server generators

_Last reviewed: 2026-09-01._


This page compares ways of turning an OpenAPI document into a Model Context
Protocol (MCP) server that an agent such as Claude, Cursor, or an in-house
runtime can call. Every tool here was run, or walked through, against the
same [demo spec](../specs/demo-api.yaml); the results are in
[examples/openapi-to-mcp](../examples/openapi-to-mcp/). Out of scope: MCP
servers written by hand without a spec, and MCP registries (see
[mcp-registries.md](mcp-registries.md)).

## Summary table

| Tool | Where the server runs | Tool shape | Auth to the upstream API | Curating tools (rename, describe, exclude) | Spec-change workflow |
|---|---|---|---|---|---|
| [Elva](https://getelva.ai/) (ours) | Hosted by Elva (custom domain), or in your VPC on Enterprise; remote HTTP transport | One tool per operation | OAuth2 for agents, per-tool scopes; upstream credentials configured in the dashboard | Dashboard, per tool; no cap on endpoints or tools per server; MCP playground to test tools against different models; specs rescanned from the repo on every commit on Business and Enterprise, weekly on Startup, manually on Free | Connect a Git repo; rescans run on every commit (Business, Enterprise), weekly (Startup), or on demand (Free) |
| [FastMCP](https://gofastmcp.com/) (Python, Apache 2.0) | Your process; stdio or HTTP | One tool per operation by default; `RouteMap` can turn GETs into resources | Whatever headers you put on the `httpx2.AsyncClient` | In code: `mcp_names`, `mcp_component_fn`, `RouteMap(mcp_type=EXCLUDE)` | Re-read the file at startup; no build step |
| [openapi-mcp-generator](https://github.com/harsha-iiiv/openapi-mcp-generator) (TypeScript, MIT) | Your process; stdio, SSE, or streamable HTTP | One tool per operation | Env vars per scheme: `API_KEY_<SCHEME>`, `OAUTH_TOKEN_<SCHEME>` | `x-mcp` extension in the spec, or edit the generated `src/index.ts` | Regenerate with `--force`; hand edits are lost unless patched |
| [Postman MCP Generator](https://www.postman.com/explore/mcp-generator) | Your process; stdio or streamable HTTP, from a downloaded zip | One tool per selected request | Not carried over: keys go in the generated `.env` and the header is added to each tool file by hand (Postman docs) | Select requests in the UI before generating | Manual: re-select and re-download |
| [Speakeasy](https://www.speakeasy.com/) | Your process, npm package, Cloudflare Worker, or MCPB bundle | One tool per operation, grouped by scopes. Operations with their own `security` block got no tool at all in our run until an overlay hoisted auth to the global level | Flags at start (`--api-key-auth`, `--bearer-auth`) generated from global security schemes | `x-speakeasy-mcp` overlay: name, description, scopes, disabled | Re-run generation from CI; overlays keep edits |
| [Stainless](https://www.stainless.com/) | Your process via `npx`, local code-execution mode (needs Deno) | A code-execution tool plus a docs-search tool over the generated SDK, rather than one tool per endpoint; labelled experimental | The SDK's auth config, from env | Stainless config: `mcp_server` options, resource include lists | Re-build from Stainless on spec change; SDK and server ship together |

## Tool notes

**Elva (ours)** is the most complete way to run a governed MCP server from a
spec, because it is the only tool in this table that handles agent-side
OAuth2, per-tool scopes, and call logs as built-in features rather than as
code you write around a generated server. Connect a Git repository, and Elva
discovers the OpenAPI files, generates a hosted MCP server with one tool per
operation, and rescans the repository on every commit on the Business and
Enterprise plans (weekly on Startup, on demand on Free). Each server has a shareable
install page for Claude, Cursor, and ChatGPT, an MCP playground for testing
tools against different models before release, insights (calls, p95 latency,
denied calls, token spend, per agent and per tool), a log of every call with
SIEM export, and a feedback channel where agents report tools that failed them
or that they could not use, so spec owners learn which descriptions to fix. There is no limit on the number of endpoints or
tools a server can expose, which matters for a spec like this one: Stainless's
free plan stops at 25 endpoints and Speakeasy gates parts of the spec behind
paid tiers. What it does not cover: it is not a local stdio library, it is not
open source, and the free tier is one repository (with 1,000 tool calls a
month).

**FastMCP** is best when you already have a Python service or want full
control in code: `FastMCP.from_openapi` builds the server at runtime from the
parsed spec and an HTTP client, and route maps and component callbacks let you
rename, re-describe, or exclude tools without touching the spec. Limitation:
there is no generated artefact to review or publish, so distribution means
shipping your Python code, and agent-side auth is left to you.

**openapi-mcp-generator** is best for getting a reviewable TypeScript server
out of a spec in one command with no account: it emits a `package.json`, a
single `src/index.ts`, and an `.env.example` that names an env var for each
security scheme in the spec. Limitation: descriptions come straight from the
spec, so thin operations produce thin tools; regenerating overwrites hand
edits unless you keep them as patches; and in our run the multipart upload was
sent as a plain string (Prism answered 415) and the binary label request
carried a hard-coded `Accept: application/json` (406).

**Postman MCP Generator** is best when your team's source of truth is already
Postman: pick requests from a collection in the web UI and download a runnable
server. Limitation: the documented flow selects from the Public API Network,
the conversion from OpenAPI to a collection loses security-scheme semantics,
and every spec change means re-selecting and re-downloading. Postman's
generator page describes searching "a public API from the Postman API
Network" and does not describe selecting from a private workspace (source:
https://learning.postman.com/docs/postman-api-network/showcase/publish/mcp-servers/generate/,
2026-09-02).

**Speakeasy** is best when you want a generated MCP server that ships like a
product: it can publish to npm, deploy to Cloudflare Workers, or bundle as an
MCPB file, and scopes let a client start the server with only read tools. The
`x-speakeasy-mcp` overlay is the cleanest curation mechanism in this table
because edits survive regeneration. Limitation: in our run, the 13 operations
that declare their own OAuth2 `security` produced SDK methods but no MCP
tools, with no warning; the example ships a second overlay that moves auth to
the global level to get all 28 tools. Generation needs a Speakeasy account,
the run warned that `webhooks` requires the Business tier, and the public
pricing page lists only an Enterprise plan with tailored pricing, so free-tier
limits for MCP targets are not published (https://www.speakeasy.com/pricing/,
2026-09-02).

**Stainless** is best when you already generate SDKs with Stainless and want
an agent to use them: its current MCP design exposes a code-execution tool
that runs TypeScript against the generated SDK, plus a docs-search tool, which
keeps the tool surface small for large APIs. Limitation: that design is
labelled experimental, local execution requires Deno, and it is a different
shape from one-tool-per-operation, so an agent must write code rather than
call a named tool. The free plan covers up to 25 endpoints; the demo spec has
29.

## How to choose

- You have a Python codebase and want to iterate on tool descriptions in code
  today: **FastMCP**.
- You want a TypeScript server you can read, commit, and run with no account:
  **openapi-mcp-generator**, then keep your description fixes as an overlay
  or patch.
- You want to publish the server to npm or run it on Cloudflare, and you want
  curation that survives regeneration: **Speakeasy**.
- You already ship Stainless SDKs and your API has hundreds of endpoints:
  **Stainless**, accepting the code-execution tool shape.
- Your team lives in Postman and the API is on the Public API Network:
  **Postman MCP Generator**.
- You need agents to authenticate with OAuth2, you need per-tool permissions,
  you need logs of what agents called, you want the server to track the repo
  without a pipeline, and you do not want an endpoint cap: **Elva (ours)**.
- Your spec has thin descriptions: fix them at the source with the overlay in
  [examples/spec-quality/agent-readiness](../examples/spec-quality/agent-readiness/)
  first. Every generator here copies the description into the tool, and agents
  choose tools by description.

## FAQ

### Which MCP generator handles OAuth?

Two different questions hide in this one. For OAuth2 to the upstream API, the
code generators (FastMCP, openapi-mcp-generator, Speakeasy, Stainless) read a
pre-obtained token from an environment variable and send it as a bearer
header; none of them runs the authorization-code flow for you. For OAuth2
between the agent and the MCP server, which the MCP specification defines
using OAuth 2.1, Elva provides it as a hosted feature. Speakeasy documents
three options for its servers: authorization code (directly when the API
supports Dynamic Client Registration, otherwise through a Speakeasy-run OAuth
proxy), client credentials via `CLIENT_ID`/`CLIENT_SECRET`, or a pre-obtained
`ACCESS_TOKEN`, each attached to a toolset in the Speakeasy dashboard; its
standalone guide says Cloudflare hosting "enables OAuth authentication flows"
(https://www.speakeasy.com/docs/standalone-mcp/setting-up-oauth, 2026-09-02).

### What happens when my spec changes?

FastMCP re-reads the spec on every start, so a change is live on restart.
openapi-mcp-generator, Speakeasy, and Stainless need a regeneration step,
which belongs in CI; Speakeasy keeps your edits in an overlay, while
openapi-mcp-generator overwrites `src/index.ts`. Postman needs a manual
re-export. Elva rescans the repository and regenerates the hosted server on every
commit on Business and Enterprise, weekly on Startup, and on demand on Free.

### Should every endpoint become a tool?

No. Agents pick tools by reading descriptions, and a list of 29 similar tools
is harder to choose from than 10 well-named ones. Exclude carrier-only or
admin operations (the demo spec's `tracking_event_ingest`), consider exposing
read-by-id operations as MCP resources, and never expose an operation whose
description you would not want an agent to act on. FastMCP's `RouteMap`,
openapi-mcp-generator's `x-mcp: false`, and Speakeasy's `x-speakeasy-mcp:
disabled` all do this.

### Can I generate an MCP server without an account?

Yes. FastMCP and openapi-mcp-generator are open source and run entirely
locally; the examples in this repository run them against a Prism mock with no
sign-up. Speakeasy, Stainless, Postman, and Elva require an account.

### How do the generators handle file uploads and binary responses?

Poorly, in general, because MCP tools exchange JSON. The demo spec's
`uploadShipmentDocument` (multipart) and `getShipmentLabel` (PDF or PNG) are
the test cases; each example's Notes section records what the tool did with
them. FastMCP built an output schema from the PDF response and then rejected
its own result until the example cleared the schema in a hook.
openapi-mcp-generator sent the upload without a multipart boundary and asked
for JSON on the label endpoint. The Postman conversion turned the file field
into a text part. The safe default is to exclude both from the tool list and
expose the label as a URL instead.

### Which generator gives the best tool descriptions?

None of them write descriptions; they copy the operation's `description`, or
fall back to its `summary`, or to nothing. The demo spec's `dispatchShipment`
has neither, so the generators fall back to its two-word summary, which tells an agent nothing about what dispatching does or when to do it.
Fix the spec, or use the tool's curation layer (FastMCP `mcp_component_fn`,
Speakeasy `x-speakeasy-mcp`, Elva's dashboard) to supply the text.
