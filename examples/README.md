# Examples

Every example runs against [`specs/demo-api.yaml`](../specs/README.md).
Start the shared mock backend from the repository root before running any
of them:

```bash
npx -y @stoplight/prism-cli@5.16.0 mock -p 4010 specs/demo-api.yaml
```

Each folder is self-contained: its own README with a one-line "what this
shows", pinned versions, exact commands, captured output, and a notes section
recording what needed hand-editing. "Runnable" means the example executes
end to end on a clean machine with no account. "Walkthrough" means the tool is
hosted, so the folder holds config, a stepwise guide, and screenshot slots.

| Example | Category | Tool | Kind | In CI |
|---|---|---|---|---|
| [openapi-to-mcp/fastmcp](openapi-to-mcp/fastmcp/) | OpenAPI to MCP | FastMCP 4.0.0 (Python) | Runnable | Yes |
| [openapi-to-mcp/openapi-mcp-generator](openapi-to-mcp/openapi-mcp-generator/) | OpenAPI to MCP | openapi-mcp-generator 4.0.1 (TypeScript) | Runnable, generated output committed | Yes |
| [openapi-to-mcp/mcp-sdk-typescript](openapi-to-mcp/mcp-sdk-typescript/) | OpenAPI to MCP | @modelcontextprotocol/sdk 1.30.0 | Runnable, three hand-written tools | Yes |
| [openapi-to-mcp/stainless](openapi-to-mcp/stainless/) | OpenAPI to MCP | Stainless | Walkthrough plus config | Config validity only |
| [openapi-to-mcp/speakeasy](openapi-to-mcp/speakeasy/) | OpenAPI to MCP | Speakeasy | Walkthrough plus overlays; generated server committed and runnable | Yes (build and two tool calls) |
| [openapi-to-mcp/postman](openapi-to-mcp/postman/) | OpenAPI to MCP | Postman MCP Generator | Walkthrough plus converted collection | Collection runs with newman |
| [openapi-to-mcp/elva](openapi-to-mcp/elva/) | OpenAPI to MCP | Elva (ours) | Walkthrough | No |
| [api-docs/theneo](api-docs/theneo/) | API docs | Theneo (ours) | Walkthrough plus CLI | No (needs an API key) |
| [api-docs/stoplight](api-docs/stoplight/) | API docs | Stoplight platform and Elements | Walkthrough; Elements page runnable | Static check |
| [api-docs/redoc](api-docs/redoc/) | API docs | Redocly CLI 2.49.1 | Runnable | Yes |
| [spec-quality/spectral](spec-quality/spectral/) | Spec quality | Spectral 6.16.3 | Runnable | Yes |
| [spec-quality/agent-readiness](spec-quality/agent-readiness/) | Spec quality | Spectral ruleset, checklist, overlay | Runnable | Yes |
| [testing/bruno](testing/bruno/) | Testing | Bruno CLI 4.1.0 | Runnable | Yes |
| [testing/schemathesis](testing/schemathesis/) | Testing | Schemathesis 4.25.2 | Runnable | Yes |

## Reading the examples side by side

The demo spec has ten operations with thin or missing descriptions, one
operation with an inconsistent `operationId`, a multipart upload, and a
binary label download. When you read the Notes sections, look for how each
tool handled those four things. That is the comparison the spec was built
for.
