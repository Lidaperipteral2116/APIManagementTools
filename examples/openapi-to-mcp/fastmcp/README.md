# FastMCP: OpenAPI to MCP at start-up, with a fix-up hook

**What this shows:** turning `specs/demo-api.yaml` into a 28-tool MCP server in about 80 lines of Python with `FastMCP.from_openapi`, then using `route_maps` to drop the carrier-only endpoint and `mcp_component_fn` to repair the descriptions the spec gets wrong and to tell the model which calls need an OAuth2 token.

Files:

| File | Purpose |
| --- | --- |
| `server.py` | Loads the spec, builds the `httpx2` client from env, calls `FastMCP.from_openapi`, runs on stdio. |
| `overrides.py` | `DESCRIPTION_OVERRIDES`: hand-written text for the 9 operations whose spec description is missing or useless. |
| `smoke_test.py` | In-process test through `fastmcp.Client`: counts tools, checks `dispatchShipment` got a real description, calls `listCarriers` against Prism. |
| `requirements.txt` | Pinned: `fastmcp==4.0.0`, `httpx2==2.12.0`, `pyyaml==6.0.3`. |
| `.env.example` | The three environment variables the server reads. |
| `.gitignore` | `.venv/`, `__pycache__/`, `.env`. |

## Install

Python 3.12 or newer.

```bash
cd examples/openapi-to-mcp/fastmcp
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # values are placeholders; anything non-empty works against Prism
set -a; source .env; set +a        # the server reads process env only; it does not parse .env itself
```

## Start the mock API

From the repository root, in a second terminal:

```bash
npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml
```

Prism enforces the spec's security: GET operations need `X-API-Key: <anything>`, the OAuth2 operations need `Authorization: Bearer <anything>`, everything else is 401.

## Run

```bash
python server.py                   # MCP server on stdio; logs go to stderr
```

Inspect it interactively (opens a browser UI):

```bash
npx -y @modelcontextprotocol/inspector@2.4.0 python server.py
```

Or without the UI:

```bash
npx -y @modelcontextprotocol/inspector@2.4.0 --cli python server.py --method tools/list
```

Smoke test (needs Prism running; sets `PARCELIO_API_KEY=demo` itself if unset):

```bash
python smoke_test.py
```

### Claude Desktop

`claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`). Use absolute paths; Claude Desktop does not inherit your shell environment, so credentials go in `env`.

```json
{
  "mcpServers": {
    "parcelio-fastmcp": {
      "command": "/absolute/path/to/examples/openapi-to-mcp/fastmcp/.venv/bin/python",
      "args": ["/absolute/path/to/examples/openapi-to-mcp/fastmcp/server.py"],
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

`python smoke_test.py` (trimmed; FastMCP's start-up banner on stderr omitted):

```
tools/list -> 28 tools
addPackage, cancelPickup, cancelShipment, createShipment, createWebhookSubscription, deleteWebhookSubscription, dispatchShipment, getCarrier, getPackage, getPickup, getShipment, getShipmentLabel, getTrackingByNumber, getWebhookSubscription, listCarrierServices, listCarriers, listPackages, listShipmentDocuments, listShipments, listTrackingEvents, listWebhookSubscriptions, quoteRates, removePackage, schedulePickup, testWebhookSubscription, updateShipment, uploadShipmentDocument, validateAddress

dispatchShipment.description:
  Requires OAuth2 scope shipments:write. Purchases the label and hands a draft shipment to the carrier. The shipment moves from `draft` to `dispatched`, gets a tracking number, and its packages become frozen. Returns 409 if the shipment is not a draft, and 402 if the account balance cannot cover the label. International shipments need a `commercial_invoice` document first.

call_tool listCarriers {limit: 2} ->
{
  "result": {
    "data": [
      {
        "id": "car_ups",
        "name": "UPS",
        "enabled": true,
        "countries": [
          "st"
        ],
        "tracking_url_template": "https://www.ups.com/track?tracknum={tracking_number}"
      }
    ],
    "next_cursor": "eyJpZCI6InNocF85ZjNLcUxtMlhhIn0",
    "has_more": true
  }
}

OK
```

(`"countries": ["st"]` is Prism filling a `minLength: 2` string, not a real country code.)

`npx -y @modelcontextprotocol/inspector@2.4.0 --cli python server.py --method tools/list` starts with:

```
{
  "tools": [
    {
      "name": "listShipments",
      "title": "Listshipments",
      "description": "Returns shipments belonging to the authenticated account, newest\nfirst. Filter by `status` ...",
      "inputSchema": {
        "type": "object",
        "properties": {
          "limit": {
            "type": "integer",
            "maximum": 100,
            "minimum": 1,
            "default": 20,
            "description": "Maximum number of items to return per page."
          },
```

## What the code decides, and why

**Everything is a tool.** FastMCP can map GET-by-id operations to `RESOURCE_TEMPLATE`s (the commented-out `RouteMap` in `server.py` does exactly that with one regex). We did not, because Claude Desktop and most other hosts only call tools on their own; resources have to be attached to the conversation by the user. An agent working a shipment has to chain `getShipment` -> `dispatchShipment` -> `getShipmentLabel`, and if the first and last of those are resources the chain breaks. Resource templates make sense when the host is a document-centric app that lets users pick resources from a list.

**`tracking_event_ingest` is excluded** with a `RouteMap(methods=["POST"], pattern=r"^/tracking/events$", mcp_type=MCPType.EXCLUDE)`. It is the carrier-integration endpoint (`tracking:write` scope); a shipper's agent has no business pushing scan events. Excluding it at the route level means it never appears in `tools/list`, which is better than a description saying "do not call this". Net: 29 operations in, 28 tools out.

**`mcp_component_fn` runs once per generated component** and gets `(HTTPRoute, component)`. Three things happen there:

1. If the `operationId` is in `DESCRIPTION_OVERRIDES`, the description is replaced. FastMCP's own fallback chain is `description or summary or "Executes GET /path"`, so without the override `dispatchShipment` would be described as "Dispatch shipment" and `listPackages` (no summary either) as "Executes GET /shipments/{shipmentId}/packages".
2. If the operation only accepts OAuth2, the description is prefixed with `Requires OAuth2 scope <scopes>.` The scope list is read from the raw spec, because FastMCP's `HTTPRoute` intermediate model has no `security` field (checked in `fastmcp/utilities/openapi/models.py`). The prefix is a cheap way to make the model stop and ask for a token instead of failing with 401.
3. For operations whose 2xx response has no JSON media type (only `getShipmentLabel` here), the generated `output_schema` is set to `None`. Without this the tool is unusable: see the gotcha below.

**Auth is static headers on the `httpx2.AsyncClient`.** Both `X-API-Key` and `Authorization: Bearer` are sent on every request when set. Against Prism this is fine. Against a real API you would want the bearer only on the write operations; FastMCP does not do per-operation credential selection for you, so that would be a custom `httpx2.Auth` that inspects the request.

## Notes

What worked cleanly:

- `FastMCP.from_openapi` consumed the OpenAPI 3.1 file (with `type: [string, "null"]`, `const`, `contentEncoding`, `webhooks`) without complaint. The `webhooks` section is ignored, which is correct: it is not a callable endpoint.
- Parameter descriptions, enums, `minimum`/`maximum`, `default` all survive into the tool `inputSchema` (see the inspector output above).
- Responses come back as `structuredContent` validated against the spec's response schema. For `allOf` list envelopes FastMCP wraps the object under a `"result"` key (`x-fastmcp-wrap-result`), which is why the smoke test reads `structured_content["result"]`.
- Tool names are the `operationId`s verbatim, including the odd `tracking_event_ingest` casing, had it not been excluded.

What needed hand-editing:

- Nine descriptions (`overrides.py`). FastMCP does not warn about missing descriptions; you find out when the model picks the wrong tool.
- The OAuth2 prefix. Nothing in the generated output tells the model that 13 of the 29 operations need a different credential.

Gotchas:

- Import paths in FastMCP 4: `RouteMap` and `MCPType` come from `fastmcp.server.providers.openapi`, but `HTTPRoute` (the type of the first argument to `mcp_component_fn`) comes from `fastmcp.utilities.openapi`. The provider package does not re-export it.
- `mcp_component_fn` exceptions are swallowed and logged as warnings, not raised. A typo in the hook silently leaves descriptions unchanged; the smoke test's assertion on `dispatchShipment` is there to catch that.
- FastMCP 4 uses the `httpx2` package (`import httpx2`), not `httpx`.
- `fastmcp.Client` with a `StdioTransport` does not inherit the parent process environment. When testing the stdio server from Python, pass `env={"PARCELIO_API_KEY": ...}` explicitly, or the server sends no `X-API-Key` and Prism returns 401. The in-process `Client(mcp)` used by `smoke_test.py` has no such issue.
- `getShipmentLabel` (`application/pdf` or `image/png`): FastMCP sends `Accept: */*`, Prism answers 200, and then the call fails on the FastMCP side with `Tool getShipmentLabel has an output schema but did not return structured content`, because FastMCP derived an output schema (`{"result": {"type": "string", "contentEncoding": "binary", "contentMediaType": "application/pdf"}}`) from the response and the body is not JSON. `validate_output=False` does not help (tested; same error, the wrapper schema is still there). Setting `component.output_schema = None` in `mcp_component_fn` does: the call then returns one `TextContent` whose text is the body (`'string'` from Prism, since that is its example for a binary string; real PDF bytes on a real server). No `resource`/blob content is produced either way, so a host cannot render the label from this tool.
- `uploadShipmentDocument` is `multipart/form-data`. FastMCP generates a tool whose `file` argument is a string; sending real file bytes through an LLM tool call is not something this example demonstrates.
