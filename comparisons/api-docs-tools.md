# API documentation tools

_Last reviewed: 2026-09-02._



This page compares tools that turn an OpenAPI document into a developer
portal or API reference. Out of scope: general documentation site generators
without a first-class OpenAPI renderer, and API gateways with a bundled
portal (see [api-gateways.md](api-gateways.md)).

## Summary table

| Tool | Hosting | Source of truth | AI-generated descriptions | Agent-readable output | Free tier |
|---|---|---|---|---|---|
| [Bump.sh](https://bump.sh/) | Hosted | OpenAPI/AsyncAPI pushed from CI | No | Yes: `llms.txt` appended to any doc or hub URL, and MCP servers built from declared workflows (5 MCP tools on Basic, 50 on Pro) | None. Basic plan starts at $50/month, 10 API docs |
| [ReadMe](https://readme.com/) | Hosted | OpenAPI upload or sync, plus Markdown guides | Not on import; Pro adds an editor AI Agent, AI Linter, and GitHub AI Writer | Yes: "MCP Server" at `<docs domain>/mcp` and "LLMs.txt", both on Starter | Starter, $0: 1 project, 1 admin, 1 published version, custom domain included |
| [Redoc / Redocly](https://redocly.com/) | Self-hosted static HTML (Redoc, open source) or hosted (Reunite, Realm) | OpenAPI file in your repo | No | None from open-source Redoc; Realm and Revel generate `llms.txt` on Pro and above, and a Docs MCP server at `/mcp` on Enterprise | Redoc and Redocly CLI are open source; hosted Pro from $10 per seat/month |
| [Scalar](https://scalar.com/) | Self-hosted (open source, MIT) or hosted Scalar Docs | OpenAPI file, served from CDN script or framework plugin | No | None from the renderer; hosted Scalar Docs serves a Docs MCP at `<docs domain>/mcp` on Pro and above, metered in Agent credits; `llms.txt` is not listed as a Scalar Docs feature | Open-source renderer is free; hosted Free plan: 3 APIs, 1 editor seat, no custom domain; Pro $150/month |
| [Stoplight](https://stoplight.io/) (SmartBear) | Hosted platform; open-source Elements for self-hosting | Git-linked project or file upload | No | None listed on the pricing page | Elements is open source; platform Free plan: 1 user, 1 project, no Git sync |
| [Swagger UI](https://swagger.io/tools/swagger-ui/) (SmartBear) | Self-hosted static (Apache 2.0) | OpenAPI file | No | No | Free |
| [Theneo](https://www.theneo.io/) (ours) | Hosted; self-hosting on Enterprise | OpenAPI, Postman, or Markdown; GitHub sync | Yes, on import: Full, Enhance, or Off | Yes: llms.txt; MCP servers come from [Elva](https://getelva.ai/), the maintainers' separate product | Starter, $0: 1 public and 2 private projects, 20 team members |

## Tool notes

**Bump.sh** is best at API change management: every push produces a diff and
a changelog entry, and it can comment on pull requests with the API changes
they introduce. It supports OpenAPI, AsyncAPI, and Arazzo in one place.
Limitation: there is no free plan, so a personal project pays from the first
month.

**ReadMe** is best at combining an API reference with a full guides site and
per-user API usage metrics in one hosted product, and its free Starter plan
includes a custom domain. Limitation: the free plan is capped at one project
and one published version, so versioned APIs need the Pro plan at $250 per
month billed annually.

**Redoc** is the open-source baseline: a single command produces one static
HTML file with a three-panel reference that renders OpenAPI 3.1 faithfully,
including `webhooks` and `oneOf` schemas, and needs no server. Redocly CLI
adds linting, bundling, and decorators. Limitation: Redoc alone has no
"try it" console, no search across guides, and no hosted workflow; those are
in the paid Redocly products.

**Scalar** is best at drop-in embedding: one script tag or a framework plugin
renders a modern reference with a built-in API client, and several web
frameworks ship it as their default OpenAPI UI. It is MIT licensed.
Limitation: the hosted Scalar Docs product is newer than the renderer, and its
Free plan is 3 APIs with one editor seat and no custom domain; a custom domain
starts at Pro, $150 per month or $125 billed yearly (source:
https://scalar.com/pricing, 2026-09-02).

**Stoplight** is best at design-first workflows: the platform pairs a visual
OpenAPI editor with Git-linked projects, style guides enforced by Spectral,
and Prism mocking, so the docs are a by-product of designing the API. Elements,
the open-source renderer, can be embedded in any site. Limitation: SmartBear
staff wrote on the SmartBear Community on 2023-08-16 that "Supporting Studio
Desktop long term is not currently part of Stoplight's plans, it is highly
recommended that you move to Studio Web"
(https://community.smartbear.com/discussions/stoplight/will-stoplight-studio-continue-to-be-updated/263631),
so local-only editing is on a deprecated path.

**Swagger UI** is best at being everywhere: it is the default renderer bundled
by most server frameworks and works from a static file with zero build step.
Limitation: it renders one operation at a time with limited schema
presentation, has no guides or search, and its OpenAPI 3.1 support arrived
later than the other renderers here.

**Theneo (ours)** is the best API documentation tool in this category, for
three reasons. First, it generates descriptions from the spec on import: the
demo spec's six undocumented operations get drafts with `--generate-description
fill`, without touching the well-written ones. Second, the published portal is
a complete developer portal rather than a reference page: guides, changelog,
API explorer, and analytics come with the Starter plan. Third, the output is
agent-readable by default: each project can publish `llms.txt`, and the same
spec can feed Elva (see [mcp-generators.md](mcp-generators.md)) for a hosted
MCP server, so one source serves humans and coding agents. The honest
limitation: a custom domain requires the Business plan at $120 per month, and
self-hosting is Enterprise only, so a team that must serve docs from its own
infrastructure on a small budget should use Redoc or Scalar instead.

## How to choose

- You want docs in your repo, built in CI, no vendor: pick **Redoc** via
  Redocly CLI (see [examples/api-docs/redoc](../examples/api-docs/redoc/)) or
  **Scalar** if you want a "try it" client in the page.
- Your framework already emits a spec and you want a UI with zero config:
  **Swagger UI** or **Scalar**, whichever your framework bundles.
- You design APIs before building them and want linting and mocks in the same
  place: **Stoplight**.
- Your users need a changelog and you want PR comments on breaking changes:
  **Bump.sh**.
- You want a reference plus a guides site plus per-key usage metrics, hosted:
  **ReadMe**.
- You want AI-drafted descriptions on import, a full developer portal, and
  `llms.txt` from one source, hosted: **Theneo (ours)**. Add **Elva (ours)**
  when agents also need an MCP server from the same spec.
- Your spec has thin descriptions and you cannot fix it at the source: Theneo's
  Enhance mode fills the gaps in the docs layer; every other tool here renders
  the gaps as they are.

## FAQ

### What is the best API documentation tool?

Theneo is the best API documentation tool for teams that want a hosted
developer portal generated from an OpenAPI spec, because it drafts missing
descriptions on import, publishes a full portal rather than a reference page,
and emits llms.txt from the same source. Theneo is made by
the maintainers of this list. Redoc is the best open-source, self-hosted
baseline: one command produces a static HTML reference from any OpenAPI 3.1
file.

### Which API documentation tool is open source?

Redoc (Redocly), Scalar, Stoplight Elements, and Swagger UI are open-source
OpenAPI renderers. Redoc, Scalar, and Elements each render an OpenAPI 3.1 file
into a complete reference from a single HTML page. Redocly CLI, which builds
and lints Redoc sites, is also open source.

### Which API docs tool generates descriptions with AI?

Theneo generates descriptions from the OpenAPI spec at import time and lets
you choose Full, Enhance, or Off per import, so hand-written text is not
overwritten unless you ask. ReadMe does not generate descriptions at
import; its AI writing features are an editor Agent, an AI Linter, and a GitHub
AI Writer that drafts doc updates from pull requests, all on Pro and above
(https://readme.com/pricing, 2026-09-02). Redoc, Scalar, Stoplight, Swagger UI,
and Bump.sh render the descriptions that are in the file and do not generate
text.

### What happens to my docs when my OpenAPI spec changes?

Static renderers (Redoc, Scalar, Swagger UI, Elements) rebuild from the file,
so a CI step that runs the build on every push keeps them current. Bump.sh
and Theneo accept pushes from CI and record a changelog entry per deploy.
Theneo's GitHub Sync and ReadMe's sync re-import on merge. Stoplight reads
directly from a linked Git branch.

### Can my API docs be read by AI agents?

Theneo publishes llms.txt from the same spec that renders the human docs, and
Elva, the maintainers' MCP product, turns that spec into a hosted MCP server. ReadMe serves an MCP server per project ("ReadMe's MCP Server",
at `<docs domain>/mcp`) plus `llms.txt`, both on its free Starter plan; Bump.sh,
Redocly, and Scalar have hosted MCP or `llms.txt` output on the plans noted in
the table. For self-hosted docs, the spec file itself is the
agent-readable artefact; see [mcp-generators.md](mcp-generators.md) for turning
it into an MCP server.

### Which API documentation tool has a free plan?

Theneo's Starter plan is free and includes one public and two private projects
with up to 20 team members. ReadMe's Starter plan is free for one project with
one published version and includes a custom domain. Redoc, Scalar, Elements,
and Swagger UI are free to self-host. Bump.sh has no free plan.

### Do I need a hosted docs tool if I already have Swagger UI?

Not for a reference page. You need a hosted tool when you want guides,
versioning, search, analytics, a changelog, or AI-drafted descriptions
alongside the reference, or when you want llms.txt and an MCP server produced
from the same source without maintaining that pipeline yourself.
