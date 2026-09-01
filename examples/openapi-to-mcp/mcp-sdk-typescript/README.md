# MCP TypeScript SDK: three tools written by hand

**What this shows:** what a tool looks like when a person writes it for a model instead of a generator deriving it from a spec: `quote_rates`, `track_shipment`, and `create_shipment`, each with a task-oriented description, a zod input schema with a description on every field, and MCP annotations, on top of `@modelcontextprotocol/sdk` 1.30.0 with a stdio transport.

Compare the tool descriptions here with the same operations in `../fastmcp` (spec text passed through) and `../openapi-mcp-generator` (spec text plus a `(Tags: ...)` suffix).

Files:

| File | Purpose |
| --- | --- |
| `server.ts` | `McpServer` + `registerTool` x3 + `StdioServerTransport`. Calls the API with `fetch`. |
| `smoke.ts` | Spawns `dist/server.js` with the SDK's `Client` + `StdioClientTransport`, lists tools, calls `track_shipment` against Prism. |
| `package.json` | Pinned: `@modelcontextprotocol/sdk` 1.30.0, `zod` 4.5.4, `typescript` 5.9.3, `tsx` 4.23.13, `@types/node` 22.20.1. |
| `.env.example` | `PARCELIO_BASE_URL`, `PARCELIO_API_KEY`, `PARCELIO_OAUTH_TOKEN`. |

## SDK API used (verified against 1.30.0 in `node_modules`)

- `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"`
- `server.registerTool(name, { title?, description?, inputSchema?, outputSchema?, annotations?, _meta? }, callback)`. `inputSchema` is a zod raw shape (`{ field: z.string() }`); the SDK converts it to JSON Schema for `tools/list` and validates arguments on `tools/call` before your callback runs.
- `import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"` and `await server.connect(transport)`.
- The older `server.tool(...)` overloads still compile but every one of them is tagged `@deprecated Use registerTool instead` in `dist/esm/server/mcp.d.ts`.
- Peer dependency on zod is `^3.25 || ^4.0`; this example uses zod 4.

## Install

Node 22.

```bash
cd examples/openapi-to-mcp/mcp-sdk-typescript
npm install
cp .env.example .env
set -a; source .env; set +a        # server reads process.env only
```

## Start the mock API

From the repository root, in a second terminal:

```bash
npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml
```

## Run

```bash
npm run build                      # tsc -> dist/server.js
npm start                          # node dist/server.js (stdio; logs on stderr)
npm run smoke                      # build, then spawn the server and call track_shipment via Prism
```

Inspect interactively:

```bash
npx -y @modelcontextprotocol/inspector@2.4.0 node dist/server.js
```

### Claude Desktop

```json
{
  "mcpServers": {
    "parcelio-handwritten": {
      "command": "node",
      "args": ["/absolute/path/to/examples/openapi-to-mcp/mcp-sdk-typescript/dist/server.js"],
      "env": {
        "PARCELIO_BASE_URL": "http://127.0.0.1:4010",
        "PARCELIO_API_KEY": "demo",
        "PARCELIO_OAUTH_TOKEN": "demo"
      }
    }
  }
}
```

## Expected output

`npm run smoke`:

```
tools/list -> 3 tools
- quote_rates: ship_from, ship_to, packages, carrier_ids
- track_shipment: trackingNumber, carrier_id
- create_shipment: service_code, ship_from, ship_to, packages, reference, label_format, metadata, idempotency_key

call_tool track_shipment {trackingNumber: 1Z999AA10123456784} ->
{
  "tracking_number": "string",
  "carrier_id": "string",
  "shipment_id": "string",
  "status": "draft",
  "estimated_delivery": "2019-08-24",
  "events": [
    {
      "id": "evt_Qm31zXp8Lr",
      "shipment_id": "string",
      "package_id": "string",
      "type": "label_created",
      "description": "Arrived at UPS facility",
      "location": {
        "city": "string",
        "region": "string",
        "country": "string"
      },
      "occurred_at": "2019-08-24T14:15:22Z",
      "recorded_at": "2019-08-24T14:15:22Z"
    }
  ]
}

OK
```

The `"string"` values are Prism's placeholders for fields without an `example` in the spec.

## What is different about a hand-written tool

Look at `track_shipment` next to the spec's `getTrackingByNumber`:

- The name says what the user wants (`track_shipment`), not what the endpoint is called.
- The description tells the model when to call it, what comes back (newest-first, max 20 events), and what to do on 429 (wait, do not loop). The spec says "rate-limited more strictly" and leaves the consequence to the reader.
- `carrier_id` explains when it is needed ("only when ... ambiguous") rather than repeating the parameter name.
- `create_shipment` exposes `idempotency_key` as a plain argument and turns it into the `Idempotency-Key` header. A generator exposes the header as a parameter named `Idempotency-Key` and hopes the model sets it.
- `create_shipment` says which credential it needs and where the server gets it, and returns `isError: true` with a readable message if the token is missing, instead of letting the API answer 401 with a problem+json body.
- Annotations: `readOnlyHint` and `idempotentHint` on the two reads, `destructiveHint: false` on the create. Generators emit none; hosts use these to decide whether to ask for confirmation.

The cost is obvious: three tools took about 250 lines, and none of it is kept in sync with the spec automatically. The `Address` and `PackageInput` shapes duplicate `components/schemas`; if the API adds a required field, this server sends 422s until someone edits it.

## Notes

What worked cleanly:

- `registerTool` with zod 4 shapes; the SDK produces the JSON Schema with `description` on every property, which is what the model sees.
- `StdioClientTransport` from the same package makes the smoke test a real end-to-end run: separate process, real stdio framing, real HTTP to Prism.
- Node 22's built-in `fetch`; no HTTP client dependency.

What needed hand-editing: all of it, by design.

Gotchas:

- `stdout` is the protocol channel. `console.log` inside the server corrupts the stream; log with `console.error`.
- `tsconfig.json` includes only `server.ts`. `smoke.ts` is run by `tsx` and is deliberately not compiled into `dist/`.
- The SDK's `Client` requires `structuredContent` to match `outputSchema` when one is declared. This server declares no `outputSchema`, so it can return the API's JSON unchanged as `structuredContent` plus a pretty-printed text copy.
- `StdioClientTransport` takes an explicit `env`; it does not pass the parent environment through by default. The smoke test spreads `process.env` and then fills in Prism-friendly defaults.
