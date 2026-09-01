/**
 * Spawns generated/build/index.js over stdio, lists tools, and calls listCarriers
 * against the Prism mock. `--probe` additionally exercises the two operations the
 * generator handles awkwardly (binary label download, multipart upload) so the
 * README can show what actually comes back.
 *
 * Prerequisites: `npm run build:generated` and Prism on API_BASE_URL.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(here, "generated", "build", "index.js");
if (!existsSync(entry)) {
  console.error(`missing ${entry}; run: npm run build:generated`);
  process.exit(1);
}
const probe = process.argv.includes("--probe");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [entry],
  env: {
    ...process.env,
    API_BASE_URL: process.env.API_BASE_URL ?? "http://127.0.0.1:4010",
    API_KEY_APIKEYAUTH: process.env.API_KEY_APIKEYAUTH ?? "demo",
    OAUTH_TOKEN_OAUTH2: process.env.OAUTH_TOKEN_OAUTH2 ?? "demo",
  },
  stderr: "pipe", // the generated server logs every request to stderr
});

const client = new Client({ name: "smoke", version: "0.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(`tools/list -> ${tools.length} tools`);
console.log(tools.map((t) => t.name).join(", "));
if (tools.length !== 29) throw new Error(`expected 29 tools, got ${tools.length}`);

const firstLine = (s) => (s ?? "").split("\n")[0];
for (const name of ["dispatchShipment", "listPackages", "updateShipment"]) {
  console.log(`${name}.description[0] = ${JSON.stringify(firstLine(tools.find((t) => t.name === name)?.description))}`);
}

console.log("\ncall_tool listCarriers {limit: 2} ->");
const carriers = await client.callTool({ name: "listCarriers", arguments: { limit: 2 } });
console.log(carriers.content[0].text);
if (carriers.isError || !carriers.content[0].text.includes('"data"')) throw new Error("listCarriers failed");

if (probe) {
  console.log("\n[probe] call_tool getShipmentLabel {shipmentId: shp_9f3KqLm2Xa} ->");
  const label = await client.callTool({ name: "getShipmentLabel", arguments: { shipmentId: "shp_9f3KqLm2Xa" } });
  const text = label.content[0].text ?? "";
  console.log(text.length > 300 ? text.slice(0, 300) + ` ... (${text.length} chars total)` : text);

  console.log("\n[probe] call_tool uploadShipmentDocument {shipmentId, requestBody: '<string>'} ->");
  const upload = await client.callTool({
    name: "uploadShipmentDocument",
    arguments: { shipmentId: "shp_9f3KqLm2Xa", requestBody: "type=commercial_invoice" },
  });
  console.log(upload.content[0].text);
}

await client.close();
console.log("\nOK");
