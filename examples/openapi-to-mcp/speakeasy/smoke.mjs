// Minimal stdio MCP client used for the smoke test: starts the generated
// server, runs initialize + tools/list, optionally one tools/call, prints a
// summary, exits 0 on success and 1 on any error.
//
// Usage:
//   node smoke.mjs <server-dir> [server args...]
//   CALL_TOOL='carriers-list-carriers|{"request":{"limit":2}}' node smoke.mjs generated start --scope read --server-url http://127.0.0.1:4010 --api-key-auth x
import { spawn } from "node:child_process";

const [, , cwd, ...args] = process.argv;
if (!cwd) {
  console.error("usage: node smoke.mjs <server-dir> [server args...]");
  process.exit(2);
}
const proc = spawn("node", ["bin/mcp-server.js", ...args], { cwd, stdio: ["pipe", "pipe", "pipe"] });
let buf = "";
let nextId = 0;
const pending = new Map();
proc.stdout.on("data", (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id != null && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    } catch {
      /* not JSON: ignore */
    }
  }
});
proc.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));
proc.on("exit", (code) => {
  if (pending.size) {
    console.error(`server exited with code ${code} before answering`);
    process.exit(1);
  }
});

const request = (method, params) =>
  new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
const notify = (method, params) =>
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");

const timer = setTimeout(() => {
  console.error("timed out after 30s");
  proc.kill();
  process.exit(1);
}, 30_000);

let failed = false;
try {
  const init = await request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "smoke", version: "0" },
  });
  console.log("server:", JSON.stringify(init.result.serverInfo));
  notify("notifications/initialized", {});

  const listed = await request("tools/list", {});
  const tools = listed.result.tools;
  console.log(`tools: ${tools.length}`);
  for (const t of tools) {
    const hints = Object.entries(t.annotations ?? {})
      .filter(([k, v]) => k.endsWith("Hint") && v === true)
      .map(([k]) => k.replace("Hint", ""))
      .join(",");
    console.log(` - ${t.name.padEnd(36)} ${hints.padEnd(12)} ${(t.description ?? "").replace(/\s+/g, " ").slice(0, 60)}`);
  }
  if (tools.length === 0) failed = true;

  if (process.env.CALL_TOOL) {
    const [name, json] = process.env.CALL_TOOL.split("|");
    const res = await request("tools/call", { name, arguments: JSON.parse(json ?? "{}") });
    const body = res.result ?? res.error;
    console.log(`call ${name} ->`, JSON.stringify(body).slice(0, 400));
    if (res.error || body.isError) failed = true;
  }
} finally {
  clearTimeout(timer);
  proc.kill();
}
process.exit(failed ? 1 : 0);
