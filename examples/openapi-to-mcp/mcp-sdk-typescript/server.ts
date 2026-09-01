#!/usr/bin/env node
/**
 * Hand-written MCP server for three Parcelio operations.
 *
 * Verified against @modelcontextprotocol/sdk 1.30.0:
 *   - McpServer                (server/mcp.js)
 *   - server.registerTool(name, { title, description, inputSchema, annotations }, cb)
 *     where inputSchema is a zod raw shape ({ field: z.string() }) and the SDK
 *     converts it to JSON Schema for tools/list and validates arguments on tools/call.
 *   - StdioServerTransport      (server/stdio.js)
 * The older server.tool(...) overloads still exist but are marked @deprecated in mcp.d.ts.
 *
 * Every field carries a description because the model only ever sees the JSON
 * Schema, never the OpenAPI document. Compare with the generated servers in
 * ../fastmcp and ../openapi-mcp-generator, which inherit whatever the spec says.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Configuration: nothing is read from disk, only the environment.
// ---------------------------------------------------------------------------
const BASE_URL = (process.env.PARCELIO_BASE_URL ?? "http://127.0.0.1:4010").replace(/\/+$/, "");
const API_KEY = process.env.PARCELIO_API_KEY ?? "";
const OAUTH_TOKEN = process.env.PARCELIO_OAUTH_TOKEN ?? "";

type Json = Record<string, unknown>;

/** One fetch wrapper for the three tools. Returns text content the model can read. */
async function callApi(opts: {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
  auth: "api-key" | "oauth";
}): Promise<{ ok: boolean; status: number; text: string; json?: unknown }> {
  const url = new URL(BASE_URL + opts.path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.auth === "api-key") {
    if (!API_KEY) throw new Error("PARCELIO_API_KEY is not set");
    headers["x-api-key"] = API_KEY;
  } else {
    if (!OAUTH_TOKEN) throw new Error("PARCELIO_OAUTH_TOKEN is not set (this operation needs an OAuth2 token)");
    headers["authorization"] = `Bearer ${OAUTH_TOKEN}`;
  }
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, { method: opts.method, headers, body });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { ok: res.ok, status: res.status, text, json };
}

function toolResult(r: Awaited<ReturnType<typeof callApi>>) {
  const pretty = r.json !== undefined ? JSON.stringify(r.json, null, 2) : r.text || `(HTTP ${r.status}, empty body)`;
  return {
    content: [{ type: "text" as const, text: r.ok ? pretty : `HTTP ${r.status}\n${pretty}` }],
    isError: !r.ok,
    // structuredContent lets clients that understand it get the raw object.
    ...(r.ok && r.json && typeof r.json === "object" ? { structuredContent: r.json as Json } : {}),
  };
}

// ---------------------------------------------------------------------------
// Shared schemas. Descriptions are written for a model deciding what to send,
// not for a developer who already read the docs.
// ---------------------------------------------------------------------------
const Address = z.object({
  name: z.string().max(100).describe("Person or company name that appears on the label."),
  company: z.string().max(100).optional().describe("Company name, if different from `name`."),
  line1: z.string().max(120).describe("Street address, first line."),
  line2: z.string().max(120).optional().describe("Apartment, suite, floor, or other second line."),
  city: z.string().max(80).describe("City or town."),
  region: z.string().max(80).optional().describe("State, province, or region code, for example `OR` or `BC`. Required for US and CA addresses."),
  postal_code: z.string().max(20).describe("Postal or ZIP code as a string (keep leading zeros)."),
  country: z.string().length(2).describe("ISO 3166-1 alpha-2 country code, uppercase, for example `US`."),
  phone: z.string().max(30).optional().describe("E.164 phone number such as `+15035550188`. Most carriers require it for international shipments."),
  email: z.string().email().optional().describe("Contact email for delivery notifications."),
  residential: z.boolean().optional().describe("True if this is a home address. Several carriers add a residential surcharge; leave unset if unknown."),
});

const Weight = z.object({
  value: z.number().positive().describe("Weight as a positive number in `unit`."),
  unit: z.enum(["kg", "lb"]).describe("Unit for `value`."),
});

const Dimensions = z.object({
  length: z.number().positive().describe("Longest side."),
  width: z.number().positive().describe("Second side."),
  height: z.number().positive().describe("Third side."),
  unit: z.enum(["cm", "in"]).describe("Unit for all three sides."),
});

const PackageInput = z.object({
  weight: Weight.describe("Actual weight of the parcel. Carriers charge on the greater of actual and dimensional weight."),
  dimensions: Dimensions.describe("Outer dimensions of the parcel. Needed for dimensional-weight pricing."),
  reference: z.string().max(64).optional().describe("Your own identifier for this parcel; printed on the label."),
  declared_value: z
    .object({
      amount: z.string().regex(/^-?\d+(\.\d{1,4})?$/).describe("Decimal amount as a string, for example `12.45`, to avoid float rounding."),
      currency: z.string().length(3).describe("ISO 4217 currency code, for example `USD`."),
    })
    .optional()
    .describe("Insured value of the contents. Omit if no insurance is wanted."),
  contents: z.string().max(200).optional().describe("Short plain-language description of the contents. Required by customs for international parcels."),
});

// ---------------------------------------------------------------------------
// Server and tools
// ---------------------------------------------------------------------------
const server = new McpServer({ name: "parcelio-handwritten", version: "0.1.0" });

server.registerTool(
  "quote_rates",
  {
    title: "Quote shipping rates",
    description:
      "Get prices and transit-time estimates for moving one or more packages between two addresses, " +
      "across every carrier service enabled on the account. Results come back cheapest first. " +
      "Nothing is created and quotes expire after 15 minutes, so call this freely while comparing options. " +
      "Use the `service_code` from the chosen rate when calling `create_shipment`. " +
      "Requires an API key (read-only operation).",
    inputSchema: {
      ship_from: Address.describe("Origin address (where the carrier collects the packages)."),
      ship_to: Address.describe("Destination address."),
      packages: z.array(PackageInput).min(1).describe("One entry per physical parcel. At least one is required."),
      carrier_ids: z
        .array(z.string())
        .optional()
        .describe("Limit quotes to these carrier ids, for example [\"car_ups\"]. Omit to quote all enabled carriers."),
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  },
  async ({ ship_from, ship_to, packages, carrier_ids }) => {
    const r = await callApi({
      method: "POST",
      path: "/rates",
      body: { ship_from, ship_to, packages, ...(carrier_ids ? { carrier_ids } : {}) },
      auth: "api-key",
    });
    return toolResult(r);
  },
);

server.registerTool(
  "track_shipment",
  {
    title: "Track a shipment by tracking number",
    description:
      "Look up the current delivery status and the most recent carrier scan events (newest first, at most 20) " +
      "for a carrier-issued tracking number. Works for shipments created through Parcelio and, for supported carriers, " +
      "for any tracking number the carrier recognises. This endpoint has a stricter rate limit than the rest of the API: " +
      "do not poll it in a loop; if it returns HTTP 429, wait for the number of seconds in the response before retrying. " +
      "Requires an API key.",
    inputSchema: {
      trackingNumber: z
        .string()
        .min(6)
        .max(40)
        .describe("Carrier tracking number exactly as printed, for example `1Z999AA10123456784`. 6 to 40 characters."),
      carrier_id: z
        .string()
        .optional()
        .describe("Carrier id such as `car_ups`. Only needed when several carriers use the same number format and the lookup is ambiguous."),
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  },
  async ({ trackingNumber, carrier_id }) => {
    const r = await callApi({
      method: "GET",
      path: `/tracking/${encodeURIComponent(trackingNumber)}`,
      query: { carrier_id },
      auth: "api-key",
    });
    return toolResult(r);
  },
);

server.registerTool(
  "create_shipment",
  {
    title: "Create a draft shipment",
    description:
      "Create a shipment in `draft` status from a sender address, a recipient address, one or more packages, and a " +
      "carrier `service_code` (get one from `quote_rates`). No label is bought and nothing is sent to the carrier until " +
      "the shipment is dispatched, so creating a draft is cheap and reversible. " +
      "Requires an OAuth2 token with the `shipments:write` scope; the server reads it from PARCELIO_OAUTH_TOKEN. " +
      "Pass an `idempotency_key` (any unique string, a UUID is fine) so a retried call cannot create two shipments.",
    inputSchema: {
      service_code: z.string().describe("Carrier service to book, for example `ups_ground`. Must be a `service_code` returned by `quote_rates`."),
      ship_from: Address.describe("Sender address."),
      ship_to: Address.describe("Recipient address."),
      packages: z.array(PackageInput).min(1).max(50).describe("One entry per physical parcel, 1 to 50."),
      reference: z.string().max(64).optional().describe("Your order or reference number, for example `ORDER-10422`. Searchable and printed on the label."),
      label_format: z.enum(["pdf", "png"]).optional().describe("Preferred label format. Defaults to `pdf`; both formats stay downloadable."),
      metadata: z
        .record(z.string(), z.string().max(500))
        .optional()
        .describe("Up to 20 string key-value pairs stored with the shipment and returned unchanged."),
      idempotency_key: z
        .string()
        .max(255)
        .optional()
        .describe("Sent as the `Idempotency-Key` header. Reuse the same value when retrying the same logical request within 24 hours."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ idempotency_key, ...body }) => {
    const url = new URL(BASE_URL + "/shipments");
    if (!OAUTH_TOKEN) {
      return { content: [{ type: "text" as const, text: "PARCELIO_OAUTH_TOKEN is not set; create_shipment needs an OAuth2 token with scope shipments:write." }], isError: true };
    }
    const headers: Record<string, string> = {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${OAUTH_TOKEN}`,
    };
    if (idempotency_key) headers["idempotency-key"] = idempotency_key;
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }
    return toolResult({ ok: res.ok, status: res.status, text, json });
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is the protocol channel; log to stderr only.
  console.error(`parcelio-handwritten MCP server on stdio, API base ${BASE_URL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
