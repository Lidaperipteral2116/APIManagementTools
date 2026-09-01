/**
 * Spawns the built server (dist/server.js) over stdio with the SDK client,
 * lists tools, and calls track_shipment against the Prism mock.
 * Run: npm run smoke   (builds first)
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(here, "dist", "server.js")],
  env: {
    ...process.env,
    PARCELIO_BASE_URL: process.env.PARCELIO_BASE_URL ?? "http://127.0.0.1:4010",
    PARCELIO_API_KEY: process.env.PARCELIO_API_KEY ?? "demo",
    PARCELIO_OAUTH_TOKEN: process.env.PARCELIO_OAUTH_TOKEN ?? "demo",
  },
  stderr: "pipe",
});

const client = new Client({ name: "smoke", version: "0.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(`tools/list -> ${tools.length} tools`);
for (const t of tools) {
  const props = Object.keys((t.inputSchema as { properties?: object }).properties ?? {});
  console.log(`- ${t.name}: ${props.join(", ")}`);
}
if (tools.length !== 3) throw new Error(`expected 3 tools, got ${tools.length}`);
for (const t of tools) {
  if (!t.description || t.description.length < 100) throw new Error(`${t.name} has a thin description`);
}

console.log("\ncall_tool track_shipment {trackingNumber: 1Z999AA10123456784} ->");
const result = await client.callTool({ name: "track_shipment", arguments: { trackingNumber: "1Z999AA10123456784" } });
const first = (result.content as Array<{ type: string; text?: string }>)[0];
console.log(first?.text);
if (result.isError) throw new Error("track_shipment returned an error");

await client.close();
console.log("\nOK");
