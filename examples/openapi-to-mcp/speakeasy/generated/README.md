# parcelio-mcp

Model Context Protocol (MCP) Server for the *parcelio-mcp* API.

[![Built by Speakeasy](https://img.shields.io/badge/Built_by-SPEAKEASY-374151?style=for-the-badge&labelColor=f3f4f6)](https://www.speakeasy.com/?utm_source=parcelio-mcp&utm_campaign=mcp-typescript)
[![License: MIT](https://img.shields.io/badge/LICENSE_//_MIT-3b5bdb?style=for-the-badge&labelColor=eff6ff)](https://opensource.org/licenses/MIT)


<br /><br />
> [!IMPORTANT]
> This MCP Server is not yet ready for production use. To complete setup please follow the steps outlined in your [workspace](https://app.speakeasy.com/org/<org>/<workspace>). Delete this notice before publishing to a package manager.

<!-- Start Summary [summary] -->
## Summary

Parcelio Shipments API: Create shipments, print labels, track packages, and receive delivery events.

Parcelio is a fictional multi-carrier shipping API used as the shared demo
spec for the awesome-api-management repository. It is deliberately
imperfect: roughly a third of the operations have thin or missing
descriptions so that spec-quality and MCP examples have something real
to detect and fix. Everything else (schemas, security, pagination,
webhooks, file upload) is complete and validates.

## Authentication

Read operations accept an API key in the `X-API-Key` header. Operations
that create, change, or delete resources require an OAuth 2.0 access
token obtained through the authorization-code flow, with the scopes
listed on each operation.

## Pagination

Every list endpoint uses cursor pagination. Pass `limit` to control page
size and `cursor` (from the previous response's `next_cursor`) to fetch
the next page. `next_cursor` is `null` on the last page.

## Idempotency

`POST /shipments` accepts an optional `Idempotency-Key` header. Repeating
a request with the same key within 24 hours returns the original result.
<!-- End Summary [summary] -->

<!-- Start Table of Contents [toc] -->
## Table of Contents
<!-- $toc-max-depth=2 -->
* [parcelio-mcp](#parcelio-mcp)
  * [Authentication](#authentication)
  * [Pagination](#pagination)
  * [Idempotency](#idempotency)
  * [Installation](#installation)
  * [Progressive Discovery](#progressive-discovery)
  * [Development](#development)
  * [Publishing to Anthropic MCP Registry](#publishing-to-anthropic-mcp-registry)
  * [Contributions](#contributions)

<!-- End Table of Contents [toc] -->

<!-- Start Installation [installation] -->
## Installation

> [!TIP]
> To finish publishing your MCP Server to npm and others you must [run your first generation action](https://www.speakeasy.com/docs/github-setup#step-by-step-guide).
<details>
<summary>Claude Desktop</summary>

Install the MCP server as a Desktop Extension using the pre-built [`mcp-server.mcpb`](./mcp-server.mcpb) file:

Simply drag and drop the [`mcp-server.mcpb`](./mcp-server.mcpb) file onto Claude Desktop to install the extension.

The MCP bundle package includes the MCP server and all necessary configuration. Once installed, the server will be available without additional setup.

> [!NOTE]
> MCP bundles provide a streamlined way to package and distribute MCP servers. Learn more about [Desktop Extensions](https://www.anthropic.com/engineering/desktop-extensions).

</details>

<details>
<summary>Cursor</summary>

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=ParcelioMcp&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJwYXJjZWxpby1tY3AiLCJzdGFydCIsIi0tc2VydmVyLWluZGV4IiwiMCIsIi0tYXBpLWtleS1hdXRoIiwiIiwiLS1iZWFyZXItYXV0aCIsIiJdfQ==)

Or manually:

1. Open Cursor Settings
2. Select Tools and Integrations
3. Select New MCP Server
4. If the configuration file is empty paste the following JSON into the MCP Server Configuration:

```json
{
  "command": "npx",
  "args": [
    "parcelio-mcp",
    "start",
    "--server-index",
    "0",
    "--api-key-auth",
    "",
    "--bearer-auth",
    ""
  ]
}
```

</details>

<details>
<summary>Claude Code CLI</summary>

```bash
claude mcp add ParcelioMcp -- npx -y parcelio-mcp start --server-index 0 --api-key-auth  --bearer-auth 
```

</details>
<details>
<summary>Gemini</summary>

```bash
gemini mcp add ParcelioMcp -- npx -y parcelio-mcp start --server-index 0 --api-key-auth  --bearer-auth 
```

</details>
<details>
<summary>Windsurf</summary>

Refer to [Official Windsurf documentation](https://docs.windsurf.com/windsurf/cascade/mcp#adding-a-new-mcp-plugin) for latest information

1. Open Windsurf Settings
2. Select Cascade on left side menu
3. Click on `Manage MCPs`. (To Manage MCPs you should be signed in with a Windsurf Account)
4. Click on `View raw config` to open up the mcp configuration file.
5. If the configuration file is empty paste the full json

```bash
{
  "command": "npx",
  "args": [
    "parcelio-mcp",
    "start",
    "--server-index",
    "0",
    "--api-key-auth",
    "",
    "--bearer-auth",
    ""
  ]
}
```
</details>
<details>
<summary>VS Code</summary>

[![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20ParcelioMcp%20MCP&color=0098FF)](vscode://ms-vscode.vscode-mcp/install?name=ParcelioMcp&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJwYXJjZWxpby1tY3AiLCJzdGFydCIsIi0tc2VydmVyLWluZGV4IiwiMCIsIi0tYXBpLWtleS1hdXRoIiwiIiwiLS1iZWFyZXItYXV0aCIsIiJdfQ==)

Or manually:

Refer to [Official VS Code documentation](https://code.visualstudio.com/api/extension-guides/ai/mcp) for latest information

1. Open [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette)
1. Search and open `MCP: Open User Configuration`. This should open mcp.json file
2. If the configuration file is empty paste the full json

```bash
{
  "command": "npx",
  "args": [
    "parcelio-mcp",
    "start",
    "--server-index",
    "0",
    "--api-key-auth",
    "",
    "--bearer-auth",
    ""
  ]
}
```

</details>
<details>
<summary> Stdio installation via npm </summary>
To start the MCP server, run:

```bash
npx parcelio-mcp start --server-index 0 --api-key-auth  --bearer-auth 
```

For a full list of server arguments, run:

```
npx parcelio-mcp --help
```

</details>
<!-- End Installation [installation] -->

<!-- Start Progressive Discovery [dynamic-mode] -->
## Progressive Discovery

MCP servers with many tools can bloat LLM context windows, leading to increased token usage and tool confusion. Dynamic mode solves this by exposing only a small set of meta-tools that let agents progressively discover and invoke tools on demand.

To enable dynamic mode, pass the `--mode dynamic` flag when starting your server:

```jsonc
{
  "mcpServers": {
    "ParcelioMcp": {
      "command": "npx",
      "args": ["parcelio-mcp", "start", "--mode", "dynamic"],
      // ... other server arguments
    }
  }
}
```

In dynamic mode, the server registers only the following meta-tools instead of every individual tool:

- **`list_tools`**: Lists all available tools with their names and descriptions.
- **`describe_tool_input`**: Returns the input schema for one or more tools by name.
- **`execute_tool`**: Executes a tool by name with its arguments.
- **`list_scopes`**: Lists the scopes available on the server.

This approach significantly reduces the number of tokens sent to the LLM on each request, which is especially useful for servers with a large number of tools.

You can combine dynamic mode with scope and tool filters:

```jsonc
{
  "mcpServers": {
    "ParcelioMcp": {
      "command": "npx",
      "args": ["parcelio-mcp", "start", "--mode", "dynamic", "--scope", "read"],
      // ... other server arguments
    }
  }
}
```
<!-- End Progressive Discovery [dynamic-mode] -->

<!-- Placeholder for Future Speakeasy SDK Sections -->

## Development

Run locally without a published npm package:
1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Run `node ./bin/mcp-server.js start --server-index 0 --api-key-auth `
To use this local version with Cursor, Claude or other MCP Clients, you'll need to add the following config:

```json
{
  "command": "node",
  "args": [
    "./bin/mcp-server.js",
    "start",
    "--server-index",
    "0",
    "--api-key-auth",
    ""
  ]
}
```

Or to debug the MCP server locally, use the official MCP Inspector: 

```bash
npx @modelcontextprotocol/inspector node ./bin/mcp-server.js start --server-index 0 --api-key-auth 
```



## Publishing to Anthropic MCP Registry

This server generates a `server.json` that conforms to the [official MCP Registry schema](https://modelcontextprotocol.io/registry/about). You can publish automatically via your Speakeasy workflow or manually using the `mcp-publisher` CLI.

### Automated Publishing (Recommended)

Add `mcpRegistry` to the `publish` block in your `workflow.yaml`:

```yaml
targets:
  my-mcp:
    target: mcp-typescript
    source: my-source
    publish:
      npm:
        token: $NPM_TOKEN
      mcpRegistry:
        auth: github-oidc  # recommended, no token needed
```

The `github-oidc` method uses GitHub Actions OIDC — no secrets required. For other auth methods:
- `github` — requires a `MCP_REGISTRY_TOKEN` secret (GitHub PAT with `read:org` + `read:user` scopes)
- `dns` — requires a `MCP_REGISTRY_TOKEN` secret (Ed25519 private key for custom domain namespaces)

When the Speakeasy workflow runs, it will automatically publish to npm first, then to the MCP Registry.

### Manual Publishing

If you prefer to publish manually, follow the [official publishing guide](https://github.com/modelcontextprotocol/registry/blob/main/docs/guides/publishing/publish-server.md):

1. **Publish to npm**: `npm publish --access public`
2. **Install the publisher CLI**:
   ```bash
   curl -sL "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher && sudo mv mcp-publisher /usr/local/bin/
   ```
3. **Authenticate** (GitHub OAuth for `io.github.*` namespaces):
   ```bash
   mcp-publisher login github
   ```
4. **Publish**: `mcp-publisher publish`
5. **Verify**:
   ```bash
   curl "https://registry.modelcontextprotocol.io/v0/servers?search=<your-mcp-name>"
   ```

## Contributions

While we value contributions to this MCP Server, the code is generated programmatically. Any manual changes added to internal files will be overwritten on the next generation. 
We look forward to hearing your feedback. Feel free to open a PR or an issue with a proof of concept and we'll do our best to include it in a future release. 

### MCP Server Created by [Speakeasy](https://www.speakeasy.com/?utm_source=parcelio-mcp&utm_campaign=mcp-typescript)
