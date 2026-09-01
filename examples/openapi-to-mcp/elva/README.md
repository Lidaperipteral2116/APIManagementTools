# Elva (ours): Git repository to hosted MCP server

**What this shows:** connecting a Git repository that contains `specs/demo-api.yaml` to Elva, letting it discover the spec, generating a hosted MCP server with OAuth2 and per-tool scopes, installing that server in Cursor, Claude Desktop and Claude Code, testing it in the MCP playground, reading the insights and call logs, seeing the feedback agents leave when a tool fails them, and watching a rescan pick up a changed description.

Elva is the maintainers' API management product (https://getelva.ai/). In this directory it is the only tool where the input is a repository rather than a file or a collection, and the output is a URL rather than a package: the server is regenerated from the repository by rescans (on every commit on Business and Enterprise, weekly on Startup, on demand on Free), so it tracks the spec without a pipeline you maintain. That is the one superlative we will make for it: it is the most complete way to run a governed MCP server from a spec, because agent-side OAuth2, per-tool scopes, and call logs are built in rather than bolted on.

This is a hosted product, so there is nothing to run locally except the clients. Sources checked on 2026-09-02: https://getelva.ai/, https://getelva.ai/mcp, https://getelva.ai/pricing, and https://docs.getelva.ai (quickstart, "How Elva works", "Bring in your APIs", "The living API catalog", "Hosted MCP servers", "MCP authentication & OAuth", "The public install page", "MCP insights & logs", "Spec quality & scoring", "AI readiness", "Workspace logs"). Where those pages do not show a UI label, the step describes the feature without naming one.

## What Elva does not cover

Elva does not produce a local stdio library you can vendor, it is not open source, and the free tier is limited to one connected repository. Within a repository there is no cap on the number of endpoints or tools a server exposes, unlike Stainless's 25-endpoint free plan or Speakeasy's tier-gated features. If you need an offline server or a package you own, use the Speakeasy or openapi-mcp-generator examples instead.

## Prerequisites

- A Git repository you can grant read access to, containing `specs/demo-api.yaml` (this repo works as-is).
- An Elva account. Sign up at https://app.getelva.ai/signup (no credit card on the free plan). Product docs: https://docs.getelva.ai.
- An MCP client: Cursor, Claude Desktop, or Claude Code.
- For the "call the API" part, the hosted server needs an API it can reach. The Prism mock on `127.0.0.1` is not reachable from Elva's servers, so either expose it with a tunnel or point the server at a deployed instance. To start the mock locally anyway (from the repo root):

```sh
npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml
```

The hosted server's upstream target is a per-deployment `baseUrl` setting (see step 6), so a tunnel URL for the mock can be entered there.

## Walkthrough

Step 1. Sign in at https://app.getelva.ai. The quickstart lists GitHub and SSO sign-in, followed by a "Pick an on-ramp" step with two choices: a repository or a spec (source: https://docs.getelva.ai/get-started/quickstart-repo-to-mcp, 2026-09-02).

![step 1](images/step-1.png)
<!-- MAINTAINER: add screenshot of the signed-in landing page with the Elva entry point visible -->

Step 2. Connect the repository. Between them, the "Bring in your APIs" and "How Elva works" pages list five ways to bring in an API: a GitHub repository via OAuth connect and scan; an OpenAPI or Swagger file (`.yaml`, `.yml`, or `.json`, any version from 2.0 to 3.1); an OpenAPI URL fetched through a guarded proxy with a 10 MB cap; a Postman API key, up to 20 collections per import; or a plain-language description from which Elva generates an OpenAPI 3.1 spec. GitHub is the only Git provider the docs name; GitLab and Bitbucket do not appear (checked 2026-09-02). Pick the GitHub route, authorise the OAuth app, and select this repository.

![step 2](images/step-2.png)
<!-- MAINTAINER: add screenshot of the repository picker with this repo selected -->

Step 3. Scan and score. Elva scans the repository and lists the OpenAPI documents it found; for this repo expect one entry, `specs/demo-api.yaml`, identified as Parcelio Shipments API v1.4.0 with 29 operations. The scanner can also generate a spec from source in JS/TS, Python, Go, and Java/Kotlin when no spec file exists, which does not apply here. Every import is validated, stored with a SHA-256 hash, scored, and embedded for search. A collection is one spec plus its computed score and embeddings. A repository scan produces one collection per detected service, a single "All endpoints" collection when the repo has no service boundaries, and, for a service with 50 or more endpoints across three or more domains, per-domain collections plus a "Misc" bucket (source: https://docs.getelva.ai/api-collections/the-living-api-catalog, 2026-09-02). For this repo the spec file is the only API source, so expect a single collection for Parcelio. The collection sidebar shows the spec's tags; the docs do not say how tags affect grouping.

![step 3](images/step-3.png)
<!-- MAINTAINER: add screenshot of the discovered-specs list showing specs/demo-api.yaml -->

Step 4. Read the score before generating. Elva grades each collection A to F from 30-plus deterministic checks in four weighted categories: design (40%), developer experience (35%), AI readiness (15%), and security (10%); the grade and the per-category breakdown sit in the collection overview's details rail. The AI-readiness checks are missing request body schema (error), no response schema (warning), and no description (info), graded A at 90 or above, B at 80, C at 70, D at 60, else F (sources: https://docs.getelva.ai/quality-and-scoring/spec-quality-and-scoring and https://docs.getelva.ai/agent-ready-with-mcp/ai-readiness, 2026-09-02). The Parcelio spec has six operations with no description, `dispatchShipment`, `listPackages`, `removePackage`, `tracking_event_ingest`, `cancelPickup`, and `testWebhookSubscription`, so expect the "no description" check to count them against the grade. The four one-line descriptions on `updateShipment`, `getPackage`, `getCarrier`, and `getWebhookSubscription` are present, and the documented check tests presence, not quality. Do not fix any of them in `specs/demo-api.yaml`; they are there on purpose.

![step 4](images/step-4.png)
<!-- MAINTAINER: add screenshot of the readiness score for the Parcelio spec -->

Step 5. Start a new MCP from the collection. The docs describe four steps: "Open any collection in the catalog and start a new MCP", then "Give the MCP a name (the slug is generated from it) and check the operations you want exposed". Uncheck `tracking_event_ingest` (a carrier-integration endpoint). "Only the operations you select are exposed. Everything you leave unchecked is stripped from the generated schema." Each selected operation becomes one tool with an auto-generated name capped at 64 characters. Generation options documented: `baseUrl`, `timeout` (default 30000 ms), `pagination`, `includeTags`/`excludeTags`, `includeMethods`/`excludeMethods`, `excludePatterns`.

![step 5](images/step-5.png)
<!-- MAINTAINER: add screenshot of the new-MCP screen with the operation checklist and tracking_event_ingest unchecked -->

Step 6. Set target and auth. The third documented step is headed "Set the target and auth". Each deployment has an Authorization tab where the upstream authentication method is declared; the documented options are no auth, API key (a header, default `X-API-Key`, or a query parameter), bearer token, JWT, basic auth, OAuth 2.0 (client credentials or password grant), and OpenID Connect (source: https://docs.getelva.ai/agent-ready-with-mcp/mcp-authentication-and-oauth, 2026-09-02). Enter the upstream `baseUrl` (a deployed Parcelio instance, or a tunnel to the Prism mock) and the upstream API key there. On the agent side, Elva's product page describes "OAuth2 + per-tool scopes": each agent gets its own key, and on every call the gateway checks whether that key is allowed to call that specific tool, so a key limited to read tools cannot call write tools. The docs do not show the screen where a key's tool set is chosen, so the table below is the intended mapping for this API rather than a transcript of that screen. Elva's own page describes the gateway as "No agent gets a raw key to your API": each agent gets its own key, revocable in one click, and policies are applied "in order, fail closed": identity, tool scope, field redaction, then rate and quota limits.

| Scope | Tools |
|---|---|
| `shipments:read` | listShipments, getShipment, getShipmentLabel, listShipmentDocuments, listPackages, getPackage, getTrackingByNumber, listTrackingEvents, listCarriers, getCarrier, listCarrierServices, quoteRates, validateAddress, getPickup, listWebhookSubscriptions, getWebhookSubscription |
| `shipments:write` | createShipment, updateShipment, cancelShipment, dispatchShipment, uploadShipmentDocument, addPackage, removePackage, schedulePickup, cancelPickup |
| `webhooks:manage` | createWebhookSubscription, deleteWebhookSubscription, testWebhookSubscription |

The scope names are the ones in `components.securitySchemes.OAuth2.flows.authorizationCode.scopes`; using the same names in Elva means an agent's consent screen matches the API's own vocabulary. The upstream credential the server uses to call Parcelio (the `X-API-Key`, and the OAuth2 client for write operations) is entered on the deployment's Authorization tab, not exposed to the agent: the docs describe a stateless token relay that exchanges and holds tokens in memory for the call and never persists credentials to disk, and the agent only receives an encrypted envelope that the runtime unwraps at call time. Which tools an agent may call is a property of its key, checked by the gateway on each call, rather than a setting on each tool.

![step 6](images/step-6.png)
<!-- MAINTAINER: add screenshot of the auth settings with OAuth2 selected and the scope-to-tool mapping -->

Step 7. Generate and deploy, then open the install page. The fourth documented step: "Elva compiles your selection into an execution schema, stores it, and publishes the deployment". Each deployment gets a hosted URL and a shareable install page with per-client instructions; the quickstart lists Claude, Cursor, VS Code, Gemini, and Codex as clients. Copy the server URL from here.

![step 7](images/step-7.png)
<!-- MAINTAINER: add screenshot of the install page with the client tabs -->

Step 7b. Test it in the MCP playground before handing out the URL. Elva's playground runs the deployed server against different client tools and models, so you can see which tool an agent picks for a prompt and what arguments it sends, without configuring a client. The docs site did not have a page for it on 2026-09-02, so this step names the feature rather than its menu label. Try "Which carriers are enabled?" and check that `listCarriers` is chosen over `getCarrier`; then try "Dispatch shipment shp_9f3KqLm2Xa" with a read-scoped key and confirm the refusal.

![step 7b](images/step-7b.png)
<!-- MAINTAINER: add screenshot of the MCP playground with a prompt, the chosen tool, and the response -->

Step 8. Add the server to a client. The server speaks streamable HTTP over the hosted URL, so the client configuration is the same shape everywhere; substitute the URL from step 7. Elva's page lists Claude, Cursor, and ChatGPT plus partner agents as clients.

Claude Code:

```sh
claude mcp add --transport http parcelio https://<hosted-url-from-step-7>
claude mcp list
```

Claude Desktop: open Settings (menu icon, File, Settings, or `Ctrl+,`), click Connectors in the sidebar, click Add at the top right and choose "Add custom connector", paste the URL, and click Add; the server's authentication prompt follows, which for OAuth redirects to the provider (source: https://modelcontextprotocol.io/docs/develop/connect-remote-servers, 2026-09-02).

Cursor (`~/.cursor/mcp.json` or the Cursor MCP settings page):

```json
{
  "mcpServers": {
    "parcelio": {
      "url": "https://<hosted-url-from-step-7>"
    }
  }
}
```

On first use the client opens the OAuth2 consent screen; the scopes requested are the ones from step 6.

![step 8](images/step-8.png)
<!-- MAINTAINER: add screenshot of the OAuth2 consent screen showing the requested scopes -->

Step 9. Try it. In the client, ask "Which carriers are enabled on my Parcelio account?" and expect a `listCarriers` call. Then ask "Dispatch shipment shp_9f3KqLm2Xa"; with a read-only token the `dispatchShipment` tool should be refused by scope, not by the upstream API.

![step 9](images/step-9.png)
<!-- MAINTAINER: add screenshot of the client calling listCarriers and the scope refusal on dispatchShipment -->

Step 10. Inspect insights, logs, and feedback. Each hosted server has six tabs: Overview, Tools, Authorization, Insights, Logs, and Settings (source: https://docs.getelva.ai/agent-ready-with-mcp/mcp-insights-and-logs, 2026-09-02). Insights shows, over a rolling 24 hours, total requests with the day-over-day trend, average response time with P95, error rate, and token usage; agents are detected automatically and get a card each with last contact, calls today, and the tools they discovered and adopted; four panels break the day down by API key usage, most error-prone tools, slowest tools (P95), and top tools by volume. Logs holds one entry per tool invocation with client, tool, upstream status, duration, and timestamp, readable in the tab or pushed out through MCP webhooks; the product page adds that every call is logged, not a sample, filterable by agent, tool, key, or outcome, exportable to a SIEM, and retained for 30 days on Business and a custom period on Enterprise (https://getelva.ai/mcp). Feedback is the third thing to look at: when a tool fails an agent or cannot be used for what the agent needed, the agent leaves feedback, and it surfaces to the people who own the spec so they can see which descriptions or schemas need fixing; the docs site did not describe this view on 2026-09-02, so no tab label is given here. Expect the two calls from step 9 in Logs, and the refused dispatch as a candidate for feedback. Separately, "Workspace logs" (Admin & management) is the human audit trail: repository connections, scan lifecycle, failed OAuth callbacks, revoked GitHub tokens, and account deletion, retained for 90 days.

![step 10](images/step-10.png)
<!-- MAINTAINER: add screenshots of MCP insights, the call log with the two calls from step 9, and the feedback view -->

Step 11. Change the spec and watch it regenerate. On a branch, edit a description in a copy of the spec (for example give `dispatchShipment` a real description), commit and push, then merge. Do not change `specs/demo-api.yaml` on `main` in this repository; use a fork or a throwaway branch of your own. Elva picks up the merge ("as your team merges changes, Elva stays in sync") and the tool description on the server changes without any client-side action. Rescan cadence depends on the plan: manual on Free, weekly on Startup, on every commit on Business (source: https://getelva.ai/pricing, 2026-09-02), so on the free plan trigger the rescan by hand after the merge. Re-run `tools/list` from the client (Claude Code: `/mcp`, then the server) to see the new description. [MEASURE: delay between the merge and the updated tool description being served]

![step 11](images/step-11.png)
<!-- MAINTAINER: add screenshot of the server's version or activity view showing the regeneration triggered by the commit -->

## Expected output

Not captured in this session: the steps above need an Elva account with a connected repository, and the mock API is not reachable from a hosted server without a tunnel. The only local command, `claude mcp add --transport http parcelio <url>`, prints `Added HTTP MCP server parcelio with URL: <url> to local config` followed by `File modified: ~/.claude.json [project: <cwd>]` (observed with Claude Code 2.1.258 on 2026-09-02; `claude mcp remove parcelio` prints `Removed MCP server "parcelio" from local config`).

## Notes

- Elva is the maintainers' product. Read the rest of this directory before choosing.
- The input is a repository, so the spec's defects reach the agent unchanged unless the readiness score prompts you to fix them at the source. That is the intended loop: fix the spec, merge, the server updates. The other tools in this directory fix descriptions in a config or overlay that lives next to the spec instead.
- OAuth2 is provided by Elva in front of the tools; the upstream API's own auth (`X-API-Key` for reads, OAuth2 for writes) is handled server-side. The upstream OAuth 2.0 credential is a service credential, not a per-user delegation: the docs support the client credentials grant (the default) and the password grant, and state that authorization code "is not yet supported end to end", recommending client credentials or OpenID Connect instead (source: https://docs.getelva.ai/agent-ready-with-mcp/mcp-authentication-and-oauth, 2026-09-02). For Parcelio's write tools that means a client-credentials client on the upstream side. Field redaction and per-key rate and quota limits are applied by the gateway before the upstream call.
- Limits: the free plan is one repository, one hosted MCP server, and 1,000 tool calls a month, with no cap on endpoints or tools per server. Per plan on 2026-09-02: Free 1 repo, 1 server, 1,000 calls; Startup 3 repos, 3 servers, 25,000 calls; Business 10 repos, 20 servers, 250,000 calls; Enterprise unlimited repos and servers with custom call limits. Prices: Startup $100 per month, Business $600 per month billed annually, Enterprise custom; all plans include unlimited members. Self-hosting inside your VPC is an Enterprise option; otherwise servers run on Elva, with a custom domain available (sources: https://getelva.ai/pricing and https://getelva.ai/mcp).
- Nothing here is runnable in CI. The smoke test for this folder is that this README exists and the image slots resolve once screenshots are added.
