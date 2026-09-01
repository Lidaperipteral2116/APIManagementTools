# Stainless: OpenAPI to SDK to MCP server

**What this shows:** taking `specs/demo-api.yaml` through Stainless to a TypeScript SDK that carries an MCP server as a subpackage, and running that server against the Prism mock with `--code-execution-mode=local`.

Stainless is best at generating SDKs that read as if a maintainer wrote them: resource-oriented naming, pagination iterators, retries and typed errors across several languages from one `stainless.yml`. The MCP server is a by-product of the TypeScript SDK, and its current design is different from every other tool in this directory: instead of one tool per endpoint it exposes a code-execution tool that runs TypeScript against the SDK, plus a docs-search tool. Read the Notes before deciding whether that suits your agent.

Generation runs on Stainless's servers, so this folder is a walkthrough with a hand-written config, not a captured build. What was actually run here is listed under Expected output.

## Files

| File | What it is |
|---|---|
| `stainless.yml` | Hand-written project config for Parcelio: 8 resources, every operation mapped, cursor pagination declared, MCP options set. Not validated by Stainless (see Notes). |
| `generated/README.md` | Explains what a maintainer with an account should paste into `generated/` and why it is empty. |
| `images/` | Screenshot slots. |

## Prerequisites

- Node 22.
- Deno, for `--code-execution-mode=local`. Stainless's guide says it can be installed separately or with `npm install deno`.
- A Stainless account. Pricing as fetched on 2026-09-01: the Free plan allows "Up to 5 generators" where "A generator is any single SDK, Docs site or MCP server", with "≤25 endpoints incl.", "100/mo free" preview builds at a "rate limit 25/day", and 5 seats. The Parcelio spec has 29 operations, so it is over the free endpoint limit; see Notes.
- Prism mock running. From the repo root:

```sh
npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml
```

## Walkthrough

Step 1. Install the CLI.

```sh
brew install stainless-api/tap/stl
stl --version
```

Other install methods are listed in the CLI repository, https://github.com/stainless-api/stainless-api-cli. The version installed here was `0.1.0-alpha.89`; the quickstart says the CLI is experimental and not to script against it yet.

Step 2. Log in.

```sh
stl auth login
stl auth status
```

`stl auth login` opens the browser. After signing in, create an organization on the Stainless site if you do not have one. An API key in `STAINLESS_API_KEY` works for CI (`stl --api-key` reads it).

![step 2](images/step-2.png)
<!-- MAINTAINER: add screenshot of the browser login completing and `stl auth status` reporting logged in -->

Step 3. Initialise a project from the repo root, pointing at the spec and at the config in this folder.

```sh
stl init \
  --openapi-spec specs/demo-api.yaml \
  --stainless-config examples/openapi-to-mcp/stainless/stainless.yml \
  --targets typescript
```

`stl init` walks you through creating a project or attaching to one, and writes `.stainless/workspace.json` (project name, spec path, config path, SDK output directories). What happens to the config depends on whether the project is new. In the CLI source (`pkg/cmd/init.go` in https://github.com/stainless-api/stainless-api-cli, read 2026-09-02), creating a new project uploads the spec and, when `--stainless-config` is given, the file's contents verbatim as the project's first `stainless.yml`; without the flag, Stainless drafts one (the quickstart says the first draft is generated with an LLM). Attaching to an existing project only records the flag's path in `workspace.json`; nothing is uploaded. In both cases `stl init` then downloads the project's config from `main` and, if the local file differs, asks before overwriting it.

![step 3](images/step-3.png)
<!-- MAINTAINER: add screenshot of the `stl init` prompts with org, project slug and targets filled in -->

Step 4. Read `stainless.yml`. The parts that matter for MCP:

```yaml
targets:
  typescript:
    package_name: parcelio
    options:
      mcp_server:
        package_name: parcelio-mcp      # default would be <package_name>-mcp
        enable_code_tool: true          # documented in the config reference
        enable_docs_tool: true          # needs the SDK docs search API exposed

resources:
  tracking:
    methods:
      ingest:
        endpoint: post /tracking/events # tracking_event_ingest
        mcp: false                      # keep it out of the agent's reach
```

`targets.typescript.options.mcp_server` is the documented key path, and `package_name`, `enable_code_tool` and `enable_docs_tool` are all listed under it in the config reference (https://www.stainless.com/docs/reference/config/, read 2026-09-02). The reference describes `enable_code_tool` as generating "a tool for the MCP server to take action with your SDK" and `enable_docs_tool` as generating a docs lookup tool that "requires you to expose the SDK docs search API for your project" (a project setting under Release in the Stainless studio, on by default according to the MCP guide). The per-resource and per-method `mcp:` switches come from the same reference, which also allows `mcp: { tool_name: ..., description: ..., tags: [...] }` on a method.

Every operation is mapped to an SDK method with the operationId in a trailing comment, so a reviewer can check coverage against the spec: 29 operations, 29 methods.

Step 5. Lint and preview.

```sh
stl lint --oas specs/demo-api.yaml --config examples/openapi-to-mcp/stainless/stainless.yml
stl preview
```

`stl preview --watch` rebuilds on file changes. Both talk to the Stainless API; the lint result in Expected output shows what happens without a login.

![step 5](images/step-5.png)
<!-- MAINTAINER: add screenshot of `stl preview` output with the TypeScript build succeeding -->

Step 6. Create a build on a branch (the alternative to preview when you want an artifact).

```sh
stl builds create --branch main
```

The TypeScript output contains `packages/mcp-server/`, the MCP server package. Copy it into `generated/` per `generated/README.md`.

![step 6](images/step-6.png)
<!-- MAINTAINER: add screenshot of the Stainless dashboard build page showing the typescript target and the MCP server subpackage -->

Step 7. Run the server against Prism. The package name is the one from `stainless.yml`; until it is published to npm, run it from the build output instead of `npx -y`.

```sh
export PARCELIO_API_KEY=fake-key            # read_env from client_settings.opts.api_key
export PARCELIO_BASE_URL=http://127.0.0.1:4010   # <PREFIX>_BASE_URL; prefix defaults to the org name
npx -y parcelio-mcp --code-execution-mode=local
```

`--code-execution-mode=local` runs the agent's TypeScript in a Deno subprocess on your machine. The other value, `stainless-sandbox`, is deprecated and returns 410 Gone. The `PARCELIO_BASE_URL` name follows the SDK convention the config reference documents under `default_env_prefix` ("e.g. ACME -> ACME_BASE_URL. If not set, defaults to the organization name"); the MCP guide's own client example sets only the API key variable, so check that the first call lands on Prism rather than the production URL.

Step 8. Inspect the tools.

```sh
npx -y @modelcontextprotocol/inspector@2.4.0 --cli \
  npx -y parcelio-mcp --code-execution-mode=local --method tools/list
```

Expect two tools, not 28. Stainless's product page names them `search_docs` and `execute` (https://www.stainless.com/products/mcp/, 2026-09-02); the MCP guide describes them as the docs search tool and the code execution tool without naming them, and a public generated server README (`packages/mcp-server/README.md` in `muxinc/mux-ts`) does the same. Compare against the names Inspector prints.

![step 8](images/step-8.png)
<!-- MAINTAINER: add screenshot of the Inspector tools list for parcelio-mcp -->

Step 9. Connect Claude Desktop. From the Stainless guide, with names substituted:

```json
{
  "mcpServers": {
    "parcelio": {
      "command": "npx",
      "args": ["-y", "parcelio-mcp", "--code-execution-mode=local"],
      "env": { "PARCELIO_API_KEY": "fake-key", "PARCELIO_BASE_URL": "http://127.0.0.1:4010" }
    }
  }
}
```

Ask "list my enabled carriers". The agent writes a short TypeScript snippet calling `client.carriers.list({ enabled: true })`, the server runs it in Deno, and the result comes back as the tool output.

![step 9](images/step-9.png)
<!-- MAINTAINER: add screenshot of Claude Desktop showing the code-execution tool call and its output -->

## Expected output

What was actually run on 2026-09-01 (macOS, no Stainless login):

```
$ brew install stainless-api/tap/stl
$ stl --version
stl version 0.1.0-alpha.89

$ stl auth status
! Not logged in.

$ stl lint --oas specs/demo-api.yaml --config examples/openapi-to-mcp/stainless/stainless.yml
POST "https://api.stainless.com/api/generate/spec": 401 Unauthorized
{
  "error": "unauthorized",
  "message": "Auth type 'unauthenticated' cannot access project "
}
```

So even linting the config is a server-side operation. `stl init --help` confirms the flags used in step 3 (`--openapi-spec`, `--stainless-config`, `--targets`, `--org`, `--project`), and `stl preview --help` confirms `--watch`, `--openapi-spec`, `--stainless-config`. `stl builds create --help` printed "No help topic for 'builds create'"; the top-level help still lists `stl builds create --branch <branch>` as a usage line, so the subcommand exists but its help is under `stl builds`.

Steps 3 and later: not captured. They need an account and, for this spec, a plan above Free. [MEASURE: `stl preview` wall-clock time for the TypeScript target; tool count and names from `tools/list`]

## Notes

- Experimental. Stainless labels MCP server generation "experimental" in its guide. Expect the config keys and the CLI flags to move.
- What the agent gets. The current design exposes two tools: a code-execution tool that accepts TypeScript and runs it against the generated SDK, and a docs-search tool that returns SDK documentation as Markdown. Stainless describes this as more accurate than one tool per endpoint for large APIs. For an agent this means: the tool list is tiny and constant regardless of API size, the model has to write code (it needs to know or look up `client.shipments.create(...)` via the docs tool), multi-step flows (quote rates, create shipment, dispatch) can happen in one tool call, and every call requires Deno. It also means scope control works differently: you exclude endpoints at generation time with `mcp: false`, and at start time the permissions guide (https://www.stainless.com/docs/mcp/permissions/, 2026-09-02) documents `--allow-http-gets`, `--allowed-methods` and `--blocked-methods` (regexes over SDK method names such as `shipments.list`, also settable as `code_exec_permissions` in the config), which is the nearest thing to Speakeasy's `--scope`; the same page says enforcement is static analysis of the submitted code that obfuscation can bypass, so a restricted API token is the real boundary. If your client cannot run Deno, or your policy wants one auditable tool call per API call, this is not the right shape. An older Stainless design generated one tool per endpoint with `--tool`, `--resource` and `--operation` filters and an `enable_all_resources` option; those still appear in Stainless blog posts and in some search results. The config reference read on 2026-09-02 does not list `enable_all_resources`; the `mcp_server` options it lists are `package_name`, `enable_code_tool`, `enable_docs_tool`, `generate_cloudflare_worker`, `instructions`, `oauth_resource_metadata` and `publish`.
- Free plan endpoint limit. The Free plan covers 25 endpoints per generator and the spec has 29 operations. Options: a paid plan, or, for a trial, a trimmed copy of the spec inside this folder (for example drop the Webhooks tag's five operations) so the count is under 25. Do not trim `specs/demo-api.yaml` itself. Preview builds are 100 per month, 25 per day, on Free.
- Hand-written config. `stainless.yml` was written against the config reference, not generated by `stl init`, and has not passed `stl lint`. The resource layout (shipments with `documents` and `packages` subresources, a separate top-level `packages` resource for `/packages/{packageId}`) mirrors the URL structure; Stainless may propose a different grouping when you run `stl init` and you should prefer its draft for naming if it disagrees. The mapping of the spec's OAuth2 authorization-code scheme to a client `access_token` option is the part most likely to need editing.
- Auth. The spec's read operations use `X-API-Key`; write operations use OAuth2 bearer tokens. `client_settings.opts` declares both so the SDK constructor and the MCP server env vars accept both. The MCP server does not run an OAuth2 flow for you; you supply a token.
- Nothing runnable in CI. The smoke test for this folder is that `stainless.yml` parses as YAML. A maintainer with an account should add `stl lint` with `STAINLESS_API_KEY` as a secret.
