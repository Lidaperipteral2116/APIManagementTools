#!/usr/bin/env node
/**
 * MCP Server generated from OpenAPI spec for parcelio-shipments-api v1.4.0
 * Generated on: 2026-09-01T20:58:48.742Z
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
  type CallToolResult,
  type CallToolRequest
} from "@modelcontextprotocol/sdk/types.js";

import { z, ZodError } from 'zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import axios, { type AxiosRequestConfig, type AxiosError } from 'axios';

/**
 * Type definition for JSON objects
 */
type JsonObject = Record<string, any>;

/**
 * Interface for MCP Tool Definition
 */
interface McpToolDefinition {
    name: string;
    description: string;
    inputSchema: any;
    method: string;
    pathTemplate: string;
    executionParameters: { name: string, in: string }[];
    requestBodyContentType?: string;
    securityRequirements: any[];
    tags?: string[];
    deprecated?: boolean;
}

/**
 * Server configuration
 */
export const SERVER_NAME = "parcelio-shipments-api";
export const SERVER_VERSION = "1.4.0";
// Base URL for the API, can be set via environment variable or determined from OpenAPI spec
export const API_BASE_URL = process.env.API_BASE_URL || "https://api.parcelio.example.com/v1";
console.error("API_BASE_URL is set to:", API_BASE_URL);

/**
 * MCP Server instance
 */
const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
);

/**
 * Map of tool definitions by name
 */
const toolDefinitionMap: Map<string, McpToolDefinition> = new Map([

  ["listShipments", {
    name: "listShipments",
    description: `Returns shipments belonging to the authenticated account, newest
first. Filter by \`status\` to find shipments in a given lifecycle
stage, or by \`carrier_id\` to see everything moving with one carrier.
Results are paginated with a cursor; follow \`next_cursor\` until it is
\`null\`.

(Tags: Shipments)`,
    inputSchema: {"type":"object","properties":{"limit":{"type":"number","minimum":1,"maximum":100,"default":20,"description":"Maximum number of items to return per page."},"cursor":{"type":"string","maxLength":512,"description":"Opaque cursor from a previous response's `next_cursor`. Omit for the first page."},"status":{"type":"string","description":"Only return shipments in this lifecycle status.","enum":["draft","dispatched","in_transit","out_for_delivery","delivered","exception","cancelled"]},"carrier_id":{"type":"string","examples":["car_ups"],"description":"Only return shipments assigned to this carrier."},"created_after":{"type":"string","format":"date-time","description":"Only return shipments created at or after this instant (RFC 3339)."}}},
    method: "get",
    pathTemplate: "/shipments",
    executionParameters: [{"name":"limit","in":"query"},{"name":"cursor","in":"query"},{"name":"status","in":"query"},{"name":"carrier_id","in":"query"},{"name":"created_after","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Shipments"],
    deprecated: false
  }],
  ["createShipment", {
    name: "createShipment",
    description: `Creates a shipment in \`draft\` status from a sender address, a
recipient address, one or more packages, and a carrier service.
No label is purchased and nothing is sent to the carrier until you
call \`dispatchShipment\`. Use \`quoteRates\` first if you need a price
before committing to a service.

Send an \`Idempotency-Key\` header to make retries safe.

(Tags: Shipments)`,
    inputSchema: {"type":"object","properties":{"Idempotency-Key":{"type":"string","maxLength":255,"description":"Client-generated unique key (UUID recommended) that makes the request safe to retry for 24 hours."},"requestBody":{"type":"object","required":["ship_from","ship_to","packages","service_code"],"properties":{"reference":{"type":"string","maxLength":64,"description":"Your order or reference number. Searchable and printed on the label.","examples":["ORDER-10422"]},"service_code":{"type":"string","description":"A `service_code` from `listCarrierServices`.","examples":["ups_ground"]},"ship_from":{"type":"object","required":["name","line1","city","postal_code","country"],"properties":{"name":{"type":"string","maxLength":100,"description":"Person or company name.","examples":["Dana Whitfield"]},"company":{"type":"string","maxLength":100},"line1":{"type":"string","maxLength":120,"examples":["48 Maple St"]},"line2":{"type":"string","maxLength":120},"city":{"type":"string","maxLength":80,"examples":["Portland"]},"region":{"type":"string","maxLength":80,"description":"State, province, or region code where applicable.","examples":["OR"]},"postal_code":{"type":"string","maxLength":20,"examples":["97209"]},"country":{"type":"string","minLength":2,"maxLength":2,"description":"ISO 3166-1 alpha-2 country code.","examples":["US"]},"phone":{"type":"string","maxLength":30,"description":"E.164 phone number. Required by most carriers for international shipments.","examples":["+15035550188"]},"email":{"type":"string","format":"email"},"residential":{"type":"boolean","description":"Whether this is a residential delivery point. Affects surcharges."}}},"ship_to":{"type":"object","required":["name","line1","city","postal_code","country"],"properties":{"name":{"type":"string","maxLength":100,"description":"Person or company name.","examples":["Dana Whitfield"]},"company":{"type":"string","maxLength":100},"line1":{"type":"string","maxLength":120,"examples":["48 Maple St"]},"line2":{"type":"string","maxLength":120},"city":{"type":"string","maxLength":80,"examples":["Portland"]},"region":{"type":"string","maxLength":80,"description":"State, province, or region code where applicable.","examples":["OR"]},"postal_code":{"type":"string","maxLength":20,"examples":["97209"]},"country":{"type":"string","minLength":2,"maxLength":2,"description":"ISO 3166-1 alpha-2 country code.","examples":["US"]},"phone":{"type":"string","maxLength":30,"description":"E.164 phone number. Required by most carriers for international shipments.","examples":["+15035550188"]},"email":{"type":"string","format":"email"},"residential":{"type":"boolean","description":"Whether this is a residential delivery point. Affects surcharges."}}},"packages":{"type":"array","minItems":1,"maxItems":50,"items":{"type":"object","required":["weight","dimensions"],"properties":{"weight":{"type":"object","required":["value","unit"],"properties":{"value":{"type":"number","exclusiveMinimum":0,"examples":[2.4]},"unit":{"type":"string","enum":["kg","lb"]}}},"dimensions":{"type":"object","required":["length","width","height","unit"],"properties":{"length":{"type":"number","exclusiveMinimum":0,"examples":[30]},"width":{"type":"number","exclusiveMinimum":0,"examples":[20]},"height":{"type":"number","exclusiveMinimum":0,"examples":[15]},"unit":{"type":"string","enum":["cm","in"]}}},"reference":{"type":"string","maxLength":64,"description":"Your identifier for this package, printed on the label."},"declared_value":{"type":"object","required":["amount","currency"],"properties":{"amount":{"type":"string","description":"Decimal amount as a string to avoid floating-point rounding.","pattern":"^-?\\d+(\\.\\d{1,4})?$","examples":["12.45"]},"currency":{"type":"string","minLength":3,"maxLength":3,"description":"ISO 4217 currency code.","examples":["USD"]}}},"contents":{"type":"string","maxLength":200,"description":"Short description of contents, required for customs."}}}},"label_format":{"type":"string","enum":["pdf","png"],"default":"pdf","description":"Preferred label format; both are always retrievable."},"metadata":{"type":"object","description":"Up to 20 string key-value pairs stored with the shipment.","maxProperties":20,"additionalProperties":{"type":"string","maxLength":500}}},"description":"The JSON request body."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/shipments",
    executionParameters: [{"name":"Idempotency-Key","in":"header"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"OAuth2":["shipments:write"]}],
    tags: ["Shipments"],
    deprecated: false
  }],
  ["getShipment", {
    name: "getShipment",
    description: `Returns the full shipment record including its packages, the
currently assigned carrier service, cost, and the latest tracking
status. Use \`listTrackingEvents\` for the complete scan history.

(Tags: Shipments)`,
    inputSchema: {"type":"object","properties":{"shipmentId":{"type":"string","pattern":"^shp_[A-Za-z0-9]{8,}$","examples":["shp_9f3KqLm2Xa"],"description":"Shipment identifier."}},"required":["shipmentId"]},
    method: "get",
    pathTemplate: "/shipments/{shipmentId}",
    executionParameters: [{"name":"shipmentId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Shipments"],
    deprecated: false
  }],
  ["cancelShipment", {
    name: "cancelShipment",
    description: `Cancels a shipment. Draft shipments are deleted outright. Dispatched
shipments are voided with the carrier, which may take up to a few
minutes; the shipment moves to \`cancelled\` once the carrier confirms.
Shipments that are already \`in_transit\` or \`delivered\` cannot be
cancelled and return \`409\`.

(Tags: Shipments)`,
    inputSchema: {"type":"object","properties":{"shipmentId":{"type":"string","pattern":"^shp_[A-Za-z0-9]{8,}$","examples":["shp_9f3KqLm2Xa"],"description":"Shipment identifier."}},"required":["shipmentId"]},
    method: "delete",
    pathTemplate: "/shipments/{shipmentId}",
    executionParameters: [{"name":"shipmentId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"OAuth2":["shipments:write"]}],
    tags: ["Shipments"],
    deprecated: false
  }],
  ["updateShipment", {
    name: "updateShipment",
    description: `Changes the mutable fields of a draft shipment: reference, service_code, ship_to address, label_format and metadata. Sender address and packages cannot be changed here (use addPackage / removePackage). Returns 409 once the shipment is dispatched. Requires OAuth2 scope shipments:write.
(Tags: Shipments)`,
    inputSchema: {"type":"object","properties":{"shipmentId":{"type":"string","pattern":"^shp_[A-Za-z0-9]{8,}$","examples":["shp_9f3KqLm2Xa"],"description":"Shipment identifier."},"requestBody":{"type":"object","description":"Fields that may change while a shipment is still in `draft`.","properties":{"reference":{"type":"string","maxLength":64},"service_code":{"type":"string"},"ship_to":{"type":"object","required":["name","line1","city","postal_code","country"],"properties":{"name":{"type":"string","maxLength":100,"description":"Person or company name.","examples":["Dana Whitfield"]},"company":{"type":"string","maxLength":100},"line1":{"type":"string","maxLength":120,"examples":["48 Maple St"]},"line2":{"type":"string","maxLength":120},"city":{"type":"string","maxLength":80,"examples":["Portland"]},"region":{"type":"string","maxLength":80,"description":"State, province, or region code where applicable.","examples":["OR"]},"postal_code":{"type":"string","maxLength":20,"examples":["97209"]},"country":{"type":"string","minLength":2,"maxLength":2,"description":"ISO 3166-1 alpha-2 country code.","examples":["US"]},"phone":{"type":"string","maxLength":30,"description":"E.164 phone number. Required by most carriers for international shipments.","examples":["+15035550188"]},"email":{"type":"string","format":"email"},"residential":{"type":"boolean","description":"Whether this is a residential delivery point. Affects surcharges."}}},"label_format":{"type":"string","enum":["pdf","png"]},"metadata":{"type":"object","maxProperties":20,"additionalProperties":{"type":"string","maxLength":500}}}}},"required":["shipmentId","requestBody"]},
    method: "patch",
    pathTemplate: "/shipments/{shipmentId}",
    executionParameters: [{"name":"shipmentId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"OAuth2":["shipments:write"]}],
    tags: ["Shipments"],
    deprecated: false
  }],
  ["dispatchShipment", {
    name: "dispatchShipment",
    description: `Purchases the label and hands a draft shipment to the carrier. The shipment moves from \`draft\` to \`dispatched\`, gets a tracking number, and its packages become frozen. Returns 409 if the shipment is not a draft, and 402 if the account balance cannot cover the label. International shipments need a \`commercial_invoice\` document first. Requires OAuth2 scope shipments:write.
(Tags: Shipments)`,
    inputSchema: {"type":"object","properties":{"shipmentId":{"type":"string","pattern":"^shp_[A-Za-z0-9]{8,}$","examples":["shp_9f3KqLm2Xa"],"description":"Shipment identifier."}},"required":["shipmentId"]},
    method: "post",
    pathTemplate: "/shipments/{shipmentId}/dispatch",
    executionParameters: [{"name":"shipmentId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"OAuth2":["shipments:write"]}],
    tags: ["Shipments"],
    deprecated: false
  }],
  ["getShipmentLabel", {
    name: "getShipmentLabel",
    description: `Returns the carrier label for a dispatched shipment. Choose the
format with the \`Accept\` header: \`application/pdf\` for a printable
page, or \`image/png\` for a 4x6 inch thermal-printer image. Draft
shipments have no label and return \`409\`.

(Tags: Shipments)`,
    inputSchema: {"type":"object","properties":{"shipmentId":{"type":"string","pattern":"^shp_[A-Za-z0-9]{8,}$","examples":["shp_9f3KqLm2Xa"],"description":"Shipment identifier."}},"required":["shipmentId"]},
    method: "get",
    pathTemplate: "/shipments/{shipmentId}/label",
    executionParameters: [{"name":"shipmentId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Shipments"],
    deprecated: false
  }],
  ["listShipmentDocuments", {
    name: "listShipmentDocuments",
    description: `Returns customs forms, commercial invoices, and any documents you
uploaded with \`uploadShipmentDocument\`. Carrier-generated documents
appear here automatically after dispatch.

(Tags: Shipments)`,
    inputSchema: {"type":"object","properties":{"shipmentId":{"type":"string","pattern":"^shp_[A-Za-z0-9]{8,}$","examples":["shp_9f3KqLm2Xa"],"description":"Shipment identifier."},"limit":{"type":"number","minimum":1,"maximum":100,"default":20,"description":"Maximum number of items to return per page."},"cursor":{"type":"string","maxLength":512,"description":"Opaque cursor from a previous response's `next_cursor`. Omit for the first page."}},"required":["shipmentId"]},
    method: "get",
    pathTemplate: "/shipments/{shipmentId}/documents",
    executionParameters: [{"name":"shipmentId","in":"path"},{"name":"limit","in":"query"},{"name":"cursor","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Shipments"],
    deprecated: false
  }],
  ["uploadShipmentDocument", {
    name: "uploadShipmentDocument",
    description: `Attaches a document such as a commercial invoice or a dangerous-goods
declaration to a shipment. Accepted types are PDF, PNG, and JPEG up
to 10 MB. International shipments must have a \`commercial_invoice\`
document before \`dispatchShipment\` will succeed.

(Tags: Shipments)`,
    inputSchema: {"type":"object","properties":{"shipmentId":{"type":"string","pattern":"^shp_[A-Za-z0-9]{8,}$","examples":["shp_9f3KqLm2Xa"],"description":"Shipment identifier."},"requestBody":{"type":"string","description":"Request body (content type: multipart/form-data)"}},"required":["shipmentId","requestBody"]},
    method: "post",
    pathTemplate: "/shipments/{shipmentId}/documents",
    executionParameters: [{"name":"shipmentId","in":"path"}],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{"OAuth2":["shipments:write"]}],
    tags: ["Shipments"],
    deprecated: false
  }],
  ["listPackages", {
    name: "listPackages",
    description: `Lists the packages that belong to one shipment, oldest first, with cursor pagination. Each package carries weight, dimensions and, after dispatch, its own tracking number.
(Tags: Packages)`,
    inputSchema: {"type":"object","properties":{"shipmentId":{"type":"string","pattern":"^shp_[A-Za-z0-9]{8,}$","examples":["shp_9f3KqLm2Xa"],"description":"Shipment identifier."},"limit":{"type":"number","minimum":1,"maximum":100,"default":20,"description":"Maximum number of items to return per page."},"cursor":{"type":"string","maxLength":512,"description":"Opaque cursor from a previous response's `next_cursor`. Omit for the first page."}},"required":["shipmentId"]},
    method: "get",
    pathTemplate: "/shipments/{shipmentId}/packages",
    executionParameters: [{"name":"shipmentId","in":"path"},{"name":"limit","in":"query"},{"name":"cursor","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Packages"],
    deprecated: false
  }],
  ["addPackage", {
    name: "addPackage",
    description: `Adds a package to a \`draft\` shipment. Weight and dimensions are
required because carriers price on dimensional weight. Once a
shipment is dispatched its packages are frozen and this returns
\`409\`.

(Tags: Packages)`,
    inputSchema: {"type":"object","properties":{"shipmentId":{"type":"string","pattern":"^shp_[A-Za-z0-9]{8,}$","examples":["shp_9f3KqLm2Xa"],"description":"Shipment identifier."},"requestBody":{"type":"object","required":["weight","dimensions"],"properties":{"weight":{"type":"object","required":["value","unit"],"properties":{"value":{"type":"number","exclusiveMinimum":0,"examples":[2.4]},"unit":{"type":"string","enum":["kg","lb"]}}},"dimensions":{"type":"object","required":["length","width","height","unit"],"properties":{"length":{"type":"number","exclusiveMinimum":0,"examples":[30]},"width":{"type":"number","exclusiveMinimum":0,"examples":[20]},"height":{"type":"number","exclusiveMinimum":0,"examples":[15]},"unit":{"type":"string","enum":["cm","in"]}}},"reference":{"type":"string","maxLength":64,"description":"Your identifier for this package, printed on the label."},"declared_value":{"type":"object","required":["amount","currency"],"properties":{"amount":{"type":"string","description":"Decimal amount as a string to avoid floating-point rounding.","pattern":"^-?\\d+(\\.\\d{1,4})?$","examples":["12.45"]},"currency":{"type":"string","minLength":3,"maxLength":3,"description":"ISO 4217 currency code.","examples":["USD"]}}},"contents":{"type":"string","maxLength":200,"description":"Short description of contents, required for customs."}},"description":"The JSON request body."}},"required":["shipmentId","requestBody"]},
    method: "post",
    pathTemplate: "/shipments/{shipmentId}/packages",
    executionParameters: [{"name":"shipmentId","in":"path"}],
    requestBodyContentType: "application/json",
    securityRequirements: [{"OAuth2":["shipments:write"]}],
    tags: ["Packages"],
    deprecated: false
  }],
  ["getPackage", {
    name: "getPackage",
    description: `Returns one package by id: weight, dimensions, declared value, contents, the shipment it belongs to, and its tracking number if the shipment has been dispatched.
(Tags: Packages)`,
    inputSchema: {"type":"object","properties":{"packageId":{"type":"string","pattern":"^pkg_[A-Za-z0-9]{8,}$","examples":["pkg_4Rt8sWq1Zn"],"description":"Package identifier."}},"required":["packageId"]},
    method: "get",
    pathTemplate: "/packages/{packageId}",
    executionParameters: [{"name":"packageId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Packages"],
    deprecated: false
  }],
  ["removePackage", {
    name: "removePackage",
    description: `Removes a package from a draft shipment. Returns 409 once the shipment has been dispatched, because carrier pricing is locked to the package set at dispatch time. Requires OAuth2 scope shipments:write.
(Tags: Packages)`,
    inputSchema: {"type":"object","properties":{"packageId":{"type":"string","pattern":"^pkg_[A-Za-z0-9]{8,}$","examples":["pkg_4Rt8sWq1Zn"],"description":"Package identifier."}},"required":["packageId"]},
    method: "delete",
    pathTemplate: "/packages/{packageId}",
    executionParameters: [{"name":"packageId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"OAuth2":["shipments:write"]}],
    tags: ["Packages"],
    deprecated: false
  }],
  ["getTrackingByNumber", {
    name: "getTrackingByNumber",
    description: `Looks up current status and the most recent scan events for a
carrier tracking number. Works for shipments created through
Parcelio and, for supported carriers, for any tracking number the
carrier recognises. This endpoint is rate-limited more strictly than
the rest of the API (see \`429\`).

(Tags: Tracking)`,
    inputSchema: {"type":"object","properties":{"trackingNumber":{"type":"string","minLength":6,"maxLength":40,"examples":["1Z999AA10123456784"],"description":"Carrier-issued tracking number."},"carrier_id":{"type":"string","description":"Disambiguates when several carriers use the same number format."}},"required":["trackingNumber"]},
    method: "get",
    pathTemplate: "/tracking/{trackingNumber}",
    executionParameters: [{"name":"trackingNumber","in":"path"},{"name":"carrier_id","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Tracking"],
    deprecated: false
  }],
  ["listTrackingEvents", {
    name: "listTrackingEvents",
    description: `Returns every scan event the carrier has reported for the shipment,
oldest first, so the list reads as a timeline. Events are appended
as they arrive; subscribe to the \`shipment.status_changed\` webhook
instead of polling if you need them in real time.

(Tags: Tracking)`,
    inputSchema: {"type":"object","properties":{"shipmentId":{"type":"string","pattern":"^shp_[A-Za-z0-9]{8,}$","examples":["shp_9f3KqLm2Xa"],"description":"Shipment identifier."},"limit":{"type":"number","minimum":1,"maximum":100,"default":20,"description":"Maximum number of items to return per page."},"cursor":{"type":"string","maxLength":512,"description":"Opaque cursor from a previous response's `next_cursor`. Omit for the first page."}},"required":["shipmentId"]},
    method: "get",
    pathTemplate: "/shipments/{shipmentId}/events",
    executionParameters: [{"name":"shipmentId","in":"path"},{"name":"limit","in":"query"},{"name":"cursor","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Tracking"],
    deprecated: false
  }],
  ["tracking_event_ingest", {
    name: "tracking_event_ingest",
    description: `Carrier integrations only: pushes a scan event for a tracking number into Parcelio. Shipper accounts do not have the tracking:write scope and will get 401. Do not call this on behalf of a shipper.
(Tags: Tracking)`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"object","required":["tracking_number","carrier_id","type","occurred_at"],"properties":{"tracking_number":{"type":"string"},"carrier_id":{"type":"string"},"type":{"type":"string","enum":["label_created","picked_up","arrived_at_facility","departed_facility","out_for_delivery","delivered","delivery_attempted","exception","returned"]},"description":{"type":"string"},"location":{"type":"object","properties":{"city":{"type":"string"},"region":{"type":"string"},"country":{"type":"string"}}},"occurred_at":{"type":"string","format":"date-time"}},"description":"The JSON request body."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/tracking/events",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"OAuth2":["tracking:write"]}],
    tags: ["Tracking"],
    deprecated: false
  }],
  ["listCarriers", {
    name: "listCarriers",
    description: `Returns the carriers available to your account. Carriers you have
connected credentials for are marked \`enabled: true\`; the rest are
listed so you can see what is supported. Use \`listCarrierServices\`
to get the service codes needed by \`createShipment\`.

(Tags: Carriers)`,
    inputSchema: {"type":"object","properties":{"limit":{"type":"number","minimum":1,"maximum":100,"default":20,"description":"Maximum number of items to return per page."},"cursor":{"type":"string","maxLength":512,"description":"Opaque cursor from a previous response's `next_cursor`. Omit for the first page."},"enabled":{"type":"boolean","description":"Only return carriers with connected credentials."}}},
    method: "get",
    pathTemplate: "/carriers",
    executionParameters: [{"name":"limit","in":"query"},{"name":"cursor","in":"query"},{"name":"enabled","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Carriers"],
    deprecated: false
  }],
  ["getCarrier", {
    name: "getCarrier",
    description: `Returns one carrier by id (for example \`car_ups\`): display name, whether this account has connected credentials, the countries it ships from, and a tracking URL template.
(Tags: Carriers)`,
    inputSchema: {"type":"object","properties":{"carrierId":{"type":"string","pattern":"^car_[a-z0-9_]{2,}$","examples":["car_ups"],"description":"Carrier identifier, for example `car_ups`."}},"required":["carrierId"]},
    method: "get",
    pathTemplate: "/carriers/{carrierId}",
    executionParameters: [{"name":"carrierId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Carriers"],
    deprecated: false
  }],
  ["listCarrierServices", {
    name: "listCarrierServices",
    description: `Returns the service levels a carrier offers (for example ground,
two-day, overnight) with their \`service_code\`, transit-time
estimate, and package limits. The \`service_code\` is what you pass
to \`createShipment\` and \`quoteRates\`.

(Tags: Carriers)`,
    inputSchema: {"type":"object","properties":{"carrierId":{"type":"string","pattern":"^car_[a-z0-9_]{2,}$","examples":["car_ups"],"description":"Carrier identifier, for example `car_ups`."}},"required":["carrierId"]},
    method: "get",
    pathTemplate: "/carriers/{carrierId}/services",
    executionParameters: [{"name":"carrierId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Carriers"],
    deprecated: false
  }],
  ["quoteRates", {
    name: "quoteRates",
    description: `Returns a price and transit estimate for every enabled carrier
service that can move the given packages between the two addresses.
Quotes are valid for 15 minutes. Nothing is created; this call is
safe to make repeatedly while a user compares options.

(Tags: Rates)`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"object","required":["ship_from","ship_to","packages"],"properties":{"ship_from":{"type":"object","required":["name","line1","city","postal_code","country"],"properties":{"name":{"type":"string","maxLength":100,"description":"Person or company name.","examples":["Dana Whitfield"]},"company":{"type":"string","maxLength":100},"line1":{"type":"string","maxLength":120,"examples":["48 Maple St"]},"line2":{"type":"string","maxLength":120},"city":{"type":"string","maxLength":80,"examples":["Portland"]},"region":{"type":"string","maxLength":80,"description":"State, province, or region code where applicable.","examples":["OR"]},"postal_code":{"type":"string","maxLength":20,"examples":["97209"]},"country":{"type":"string","minLength":2,"maxLength":2,"description":"ISO 3166-1 alpha-2 country code.","examples":["US"]},"phone":{"type":"string","maxLength":30,"description":"E.164 phone number. Required by most carriers for international shipments.","examples":["+15035550188"]},"email":{"type":"string","format":"email"},"residential":{"type":"boolean","description":"Whether this is a residential delivery point. Affects surcharges."}}},"ship_to":{"type":"object","required":["name","line1","city","postal_code","country"],"properties":{"name":{"type":"string","maxLength":100,"description":"Person or company name.","examples":["Dana Whitfield"]},"company":{"type":"string","maxLength":100},"line1":{"type":"string","maxLength":120,"examples":["48 Maple St"]},"line2":{"type":"string","maxLength":120},"city":{"type":"string","maxLength":80,"examples":["Portland"]},"region":{"type":"string","maxLength":80,"description":"State, province, or region code where applicable.","examples":["OR"]},"postal_code":{"type":"string","maxLength":20,"examples":["97209"]},"country":{"type":"string","minLength":2,"maxLength":2,"description":"ISO 3166-1 alpha-2 country code.","examples":["US"]},"phone":{"type":"string","maxLength":30,"description":"E.164 phone number. Required by most carriers for international shipments.","examples":["+15035550188"]},"email":{"type":"string","format":"email"},"residential":{"type":"boolean","description":"Whether this is a residential delivery point. Affects surcharges."}}},"packages":{"type":"array","minItems":1,"items":{"type":"object","required":["weight","dimensions"],"properties":{"weight":{"type":"object","required":["value","unit"],"properties":{"value":{"type":"number","exclusiveMinimum":0,"examples":[2.4]},"unit":{"type":"string","enum":["kg","lb"]}}},"dimensions":{"type":"object","required":["length","width","height","unit"],"properties":{"length":{"type":"number","exclusiveMinimum":0,"examples":[30]},"width":{"type":"number","exclusiveMinimum":0,"examples":[20]},"height":{"type":"number","exclusiveMinimum":0,"examples":[15]},"unit":{"type":"string","enum":["cm","in"]}}},"reference":{"type":"string","maxLength":64,"description":"Your identifier for this package, printed on the label."},"declared_value":{"type":"object","required":["amount","currency"],"properties":{"amount":{"type":"string","description":"Decimal amount as a string to avoid floating-point rounding.","pattern":"^-?\\d+(\\.\\d{1,4})?$","examples":["12.45"]},"currency":{"type":"string","minLength":3,"maxLength":3,"description":"ISO 4217 currency code.","examples":["USD"]}}},"contents":{"type":"string","maxLength":200,"description":"Short description of contents, required for customs."}}}},"carrier_ids":{"type":"array","description":"Restrict quotes to these carriers.","items":{"type":"string"}}},"description":"The JSON request body."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/rates",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Rates"],
    deprecated: false
  }],
  ["validateAddress", {
    name: "validateAddress",
    description: `Checks an address against carrier and postal databases and returns
a normalised version with any corrections applied. Use the
\`residential\` flag in the response to pick the right service level;
several carriers surcharge residential deliveries.

(Tags: Addresses)`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"object","required":["name","line1","city","postal_code","country"],"properties":{"name":{"type":"string","maxLength":100,"description":"Person or company name.","examples":["Dana Whitfield"]},"company":{"type":"string","maxLength":100},"line1":{"type":"string","maxLength":120,"examples":["48 Maple St"]},"line2":{"type":"string","maxLength":120},"city":{"type":"string","maxLength":80,"examples":["Portland"]},"region":{"type":"string","maxLength":80,"description":"State, province, or region code where applicable.","examples":["OR"]},"postal_code":{"type":"string","maxLength":20,"examples":["97209"]},"country":{"type":"string","minLength":2,"maxLength":2,"description":"ISO 3166-1 alpha-2 country code.","examples":["US"]},"phone":{"type":"string","maxLength":30,"description":"E.164 phone number. Required by most carriers for international shipments.","examples":["+15035550188"]},"email":{"type":"string","format":"email"},"residential":{"type":"boolean","description":"Whether this is a residential delivery point. Affects surcharges."}},"description":"The JSON request body."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/addresses/validate",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Addresses"],
    deprecated: false
  }],
  ["schedulePickup", {
    name: "schedulePickup",
    description: `Asks a carrier to collect one or more dispatched shipments from an
address within a time window. All shipments in one pickup must use
the same carrier. Carriers typically need at least two hours' notice
and return \`422\` for windows they cannot honour.

(Tags: Pickups)`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"object","required":["carrier_id","address","window_start","window_end","shipment_ids"],"properties":{"carrier_id":{"type":"string"},"address":{"type":"object","required":["name","line1","city","postal_code","country"],"properties":{"name":{"type":"string","maxLength":100,"description":"Person or company name.","examples":["Dana Whitfield"]},"company":{"type":"string","maxLength":100},"line1":{"type":"string","maxLength":120,"examples":["48 Maple St"]},"line2":{"type":"string","maxLength":120},"city":{"type":"string","maxLength":80,"examples":["Portland"]},"region":{"type":"string","maxLength":80,"description":"State, province, or region code where applicable.","examples":["OR"]},"postal_code":{"type":"string","maxLength":20,"examples":["97209"]},"country":{"type":"string","minLength":2,"maxLength":2,"description":"ISO 3166-1 alpha-2 country code.","examples":["US"]},"phone":{"type":"string","maxLength":30,"description":"E.164 phone number. Required by most carriers for international shipments.","examples":["+15035550188"]},"email":{"type":"string","format":"email"},"residential":{"type":"boolean","description":"Whether this is a residential delivery point. Affects surcharges."}}},"window_start":{"type":"string","format":"date-time"},"window_end":{"type":"string","format":"date-time"},"shipment_ids":{"type":"array","minItems":1,"items":{"type":"string"}},"instructions":{"type":"string","maxLength":300,"description":"Shown to the driver, for example \"Loading dock B, ring bell\"."}},"description":"The JSON request body."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/pickups",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"OAuth2":["shipments:write"]}],
    tags: ["Pickups"],
    deprecated: false
  }],
  ["getPickup", {
    name: "getPickup",
    description: `Returns a scheduled pickup, including the carrier confirmation
number once the carrier has acknowledged it.

(Tags: Pickups)`,
    inputSchema: {"type":"object","properties":{"pickupId":{"type":"string","pattern":"^pk_[A-Za-z0-9]{8,}$","examples":["pk_7Hq2mZp9Lc"],"description":"Pickup identifier."}},"required":["pickupId"]},
    method: "get",
    pathTemplate: "/pickups/{pickupId}",
    executionParameters: [{"name":"pickupId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Pickups"],
    deprecated: false
  }],
  ["cancelPickup", {
    name: "cancelPickup",
    description: `Cancels a scheduled carrier pickup. Only pickups in \`requested\` or \`confirmed\` status can be cancelled; completed pickups return 409. Requires OAuth2 scope shipments:write.
(Tags: Pickups)`,
    inputSchema: {"type":"object","properties":{"pickupId":{"type":"string","pattern":"^pk_[A-Za-z0-9]{8,}$","examples":["pk_7Hq2mZp9Lc"],"description":"Pickup identifier."}},"required":["pickupId"]},
    method: "delete",
    pathTemplate: "/pickups/{pickupId}",
    executionParameters: [{"name":"pickupId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"OAuth2":["shipments:write"]}],
    tags: ["Pickups"],
    deprecated: false
  }],
  ["listWebhookSubscriptions", {
    name: "listWebhookSubscriptions",
    description: `Returns the webhook subscriptions configured for your account,
including each subscription's delivery health over the last 24
hours.

(Tags: Webhooks)`,
    inputSchema: {"type":"object","properties":{"limit":{"type":"number","minimum":1,"maximum":100,"default":20,"description":"Maximum number of items to return per page."},"cursor":{"type":"string","maxLength":512,"description":"Opaque cursor from a previous response's `next_cursor`. Omit for the first page."}}},
    method: "get",
    pathTemplate: "/webhooks",
    executionParameters: [{"name":"limit","in":"query"},{"name":"cursor","in":"query"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Webhooks"],
    deprecated: false
  }],
  ["createWebhookSubscription", {
    name: "createWebhookSubscription",
    description: `Registers an HTTPS endpoint to receive shipment events. The
response includes a \`secret\` exactly once; use it to verify the
\`Parcelio-Signature\` header on incoming deliveries. Deliveries are
retried with exponential backoff for up to 24 hours on non-2xx
responses.

(Tags: Webhooks)`,
    inputSchema: {"type":"object","properties":{"requestBody":{"type":"object","required":["url","events"],"properties":{"url":{"type":"string","format":"uri","description":"HTTPS endpoint that receives POST deliveries.","examples":["https://hooks.example.com/parcelio"]},"events":{"type":"array","minItems":1,"uniqueItems":true,"items":{"type":"string","enum":["shipment.status_changed","shipment.delivered","shipment.exception","pickup.confirmed","pickup.completed"]}},"description":{"type":"string","maxLength":200},"active":{"type":"boolean","default":true}},"description":"The JSON request body."}},"required":["requestBody"]},
    method: "post",
    pathTemplate: "/webhooks",
    executionParameters: [],
    requestBodyContentType: "application/json",
    securityRequirements: [{"OAuth2":["webhooks:manage"]}],
    tags: ["Webhooks"],
    deprecated: false
  }],
  ["getWebhookSubscription", {
    name: "getWebhookSubscription",
    description: `Returns one webhook subscription: target URL, subscribed event types, active flag, and 24-hour delivery health. The signing secret is never returned here.
(Tags: Webhooks)`,
    inputSchema: {"type":"object","properties":{"webhookId":{"type":"string","pattern":"^whk_[A-Za-z0-9]{8,}$","examples":["whk_Bd72kPz4Qm"],"description":"Webhook subscription identifier."}},"required":["webhookId"]},
    method: "get",
    pathTemplate: "/webhooks/{webhookId}",
    executionParameters: [{"name":"webhookId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"ApiKeyAuth":[]}],
    tags: ["Webhooks"],
    deprecated: false
  }],
  ["deleteWebhookSubscription", {
    name: "deleteWebhookSubscription",
    description: `Stops deliveries to the endpoint immediately. In-flight retries are
abandoned. This cannot be undone; create a new subscription to
resume.

(Tags: Webhooks)`,
    inputSchema: {"type":"object","properties":{"webhookId":{"type":"string","pattern":"^whk_[A-Za-z0-9]{8,}$","examples":["whk_Bd72kPz4Qm"],"description":"Webhook subscription identifier."}},"required":["webhookId"]},
    method: "delete",
    pathTemplate: "/webhooks/{webhookId}",
    executionParameters: [{"name":"webhookId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"OAuth2":["webhooks:manage"]}],
    tags: ["Webhooks"],
    deprecated: false
  }],
  ["testWebhookSubscription", {
    name: "testWebhookSubscription",
    description: `Sends a synthetic \`shipment.status_changed\` event to the subscription's URL and reports whether the endpoint answered, its HTTP status, and how long it took. Use it to verify signature handling before relying on real deliveries. Requires OAuth2 scope webhooks:manage.
(Tags: Webhooks)`,
    inputSchema: {"type":"object","properties":{"webhookId":{"type":"string","pattern":"^whk_[A-Za-z0-9]{8,}$","examples":["whk_Bd72kPz4Qm"],"description":"Webhook subscription identifier."}},"required":["webhookId"]},
    method: "post",
    pathTemplate: "/webhooks/{webhookId}/test",
    executionParameters: [{"name":"webhookId","in":"path"}],
    requestBodyContentType: undefined,
    securityRequirements: [{"OAuth2":["webhooks:manage"]}],
    tags: ["Webhooks"],
    deprecated: false
  }],
]);

/**
 * Security schemes from the OpenAPI spec
 */
const securitySchemes =   {
    "ApiKeyAuth": {
      "type": "apiKey",
      "in": "header",
      "name": "X-API-Key",
      "description": "Account API key. Sufficient for read operations. Create keys in the\nParcelio dashboard under Settings, API keys.\n"
    },
    "OAuth2": {
      "type": "oauth2",
      "description": "Required for operations that create, change, or delete resources.\nTokens expire after one hour; use the refresh token to obtain a new\none.\n",
      "flows": {
        "authorizationCode": {
          "authorizationUrl": "https://auth.parcelio.example.com/oauth/authorize",
          "tokenUrl": "https://auth.parcelio.example.com/oauth/token",
          "refreshUrl": "https://auth.parcelio.example.com/oauth/token",
          "scopes": {
            "shipments:read": "Read shipments, packages, and tracking events.",
            "shipments:write": "Create, update, dispatch, and cancel shipments, packages, and pickups.",
            "tracking:write": "Push carrier tracking events (carrier integrations only).",
            "webhooks:manage": "Create, test, and delete webhook subscriptions."
          }
        }
      }
    }
  };


server.setRequestHandler(ListToolsRequestSchema, async () => {
  const toolsForClient: Tool[] = Array.from(toolDefinitionMap.values()).map(def => ({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema
  }));
  return { tools: toolsForClient };
});


server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
  const { name: toolName, arguments: toolArgs } = request.params;
  const toolDefinition = toolDefinitionMap.get(toolName);
  if (!toolDefinition) {
    console.error(`Error: Unknown tool requested: ${toolName}`);
    return { content: [{ type: "text", text: `Error: Unknown tool requested: ${toolName}` }] };
  }
  return await executeApiTool(toolName, toolDefinition, toolArgs ?? {}, securitySchemes);
});



/**
 * Type definition for cached OAuth tokens
 */
interface TokenCacheEntry {
    token: string;
    expiresAt: number;
}

/**
 * Declare global __oauthTokenCache property for TypeScript
 */
declare global {
    var __oauthTokenCache: Record<string, TokenCacheEntry> | undefined;
}

/**
 * Acquires an OAuth2 token using client credentials flow
 * 
 * @param schemeName Name of the security scheme
 * @param scheme OAuth2 security scheme
 * @returns Acquired token or null if unable to acquire
 */
async function acquireOAuth2Token(schemeName: string, scheme: any): Promise<string | null | undefined> {
    try {
        // Check if we have the necessary credentials (resolved per-scheme at runtime)
        const clientId = process.env[`OAUTH_CLIENT_ID_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
        const clientSecret = process.env[`OAUTH_CLIENT_SECRET_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
        const scopes = process.env[`OAUTH_SCOPES_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];

        if (!clientId || !clientSecret) {
            console.error(`Missing client credentials for OAuth2 scheme '${schemeName}'`);
            return null;
        }
        
        // Initialize token cache if needed
        if (typeof global.__oauthTokenCache === 'undefined') {
            global.__oauthTokenCache = {};
        }
        
        // Check if we have a cached token
        const cacheKey = `${schemeName}_${clientId}`;
        const cachedToken = global.__oauthTokenCache[cacheKey];
        const now = Date.now();
        
        if (cachedToken && cachedToken.expiresAt > now) {
            console.error(`Using cached OAuth2 token for '${schemeName}' (expires in ${Math.floor((cachedToken.expiresAt - now) / 1000)} seconds)`);
            return cachedToken.token;
        }
        
        // Determine token URL based on flow type
        let tokenUrl = '';
        if (scheme.flows?.clientCredentials?.tokenUrl) {
            tokenUrl = scheme.flows.clientCredentials.tokenUrl;
            console.error(`Using client credentials flow for '${schemeName}'`);
        } else if (scheme.flows?.password?.tokenUrl) {
            tokenUrl = scheme.flows.password.tokenUrl;
            console.error(`Using password flow for '${schemeName}'`);
        } else {
            console.error(`No supported OAuth2 flow found for '${schemeName}'`);
            return null;
        }
        
        // Prepare the token request
        let formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        
        // Add scopes if specified
        if (scopes) {
            formData.append('scope', scopes);
        }

        console.error(`Requesting OAuth2 token from ${tokenUrl}`);

        // Make the token request
        const response = await axios({
            method: 'POST',
            url: tokenUrl,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            data: formData.toString()
        });
        
        // Process the response
        if (response.data?.access_token) {
            const token = response.data.access_token;
            const expiresIn = response.data.expires_in || 3600; // Default to 1 hour
            
            // Cache the token
            global.__oauthTokenCache[cacheKey] = {
                token,
                expiresAt: now + (expiresIn * 1000) - 60000 // Expire 1 minute early
            };
            
            console.error(`Successfully acquired OAuth2 token for '${schemeName}' (expires in ${expiresIn} seconds)`);
            return token;
        } else {
            console.error(`Failed to acquire OAuth2 token for '${schemeName}': No access_token in response`);
            return null;
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error acquiring OAuth2 token for '${schemeName}':`, errorMessage);
        return null;
    }
}


/**
 * Executes an API tool with the provided arguments
 * 
 * @param toolName Name of the tool to execute
 * @param definition Tool definition
 * @param toolArgs Arguments provided by the user
 * @param allSecuritySchemes Security schemes from the OpenAPI spec
 * @returns Call tool result
 */
async function executeApiTool(
    toolName: string,
    definition: McpToolDefinition,
    toolArgs: JsonObject,
    allSecuritySchemes: Record<string, any>
): Promise<CallToolResult> {
  try {
    // Validate arguments against the input schema
    let validatedArgs: JsonObject;
    try {
        const zodSchema = getZodSchemaFromJsonSchema(definition.inputSchema, toolName);
        const argsToParse = (typeof toolArgs === 'object' && toolArgs !== null) ? toolArgs : {};
        validatedArgs = zodSchema.parse(argsToParse);
    } catch (error: unknown) {
        if (error instanceof ZodError) {
            const validationErrorMessage = `Invalid arguments for tool '${toolName}': ${error.errors.map(e => `${e.path.join('.')} (${e.code}): ${e.message}`).join(', ')}`;
            return { content: [{ type: 'text', text: validationErrorMessage }] };
        } else {
             const errorMessage = error instanceof Error ? error.message : String(error);
             return { content: [{ type: 'text', text: `Internal error during validation setup: ${errorMessage}` }] };
        }
    }

    // Prepare URL, query parameters, headers, and request body
    let urlPath = definition.pathTemplate;
    const queryParams: Record<string, any> = {};
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    let requestBodyData: any = undefined;

    // Apply parameters to the URL path, query, or headers
    definition.executionParameters.forEach((param) => {
        const value = validatedArgs[param.name];
        if (typeof value !== 'undefined' && value !== null) {
            if (param.in === 'path') {
                urlPath = urlPath.replace(`{${param.name}}`, encodeURIComponent(String(value)));
            }
            else if (param.in === 'query') {
                queryParams[param.name] = value;
            }
            else if (param.in === 'header') {
                headers[param.name.toLowerCase()] = String(value);
            }
        }
    });

    // Ensure all path parameters are resolved
    if (urlPath.includes('{')) {
        throw new Error(`Failed to resolve path parameters: ${urlPath}`);
    }
    
    // Construct the full URL
    const requestUrl = API_BASE_URL ? `${API_BASE_URL}${urlPath}` : urlPath;

    // Handle request body if needed
    if (definition.requestBodyContentType && typeof validatedArgs['requestBody'] !== 'undefined') {
        requestBodyData = validatedArgs['requestBody'];
        headers['content-type'] = definition.requestBodyContentType;
    }

    // Apply security requirements if available
    // Security requirements use OR between array items and AND within each object
    const appliedSecurity = definition.securityRequirements?.find(req => {
        // Try each security requirement (combined with OR)
        return Object.entries(req).every(([schemeName, scopesArray]) => {
            const scheme = allSecuritySchemes[schemeName];
            if (!scheme) return false;
            
            // API Key security (header, query, cookie)
            if (scheme.type === 'apiKey') {
                return !!process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
            }
            
            // HTTP security (basic, bearer)
            if (scheme.type === 'http') {
                if (scheme.scheme?.toLowerCase() === 'bearer') {
                    return !!process.env[`BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                }
                else if (scheme.scheme?.toLowerCase() === 'basic') {
                    // Username is sufficient; an empty password is valid per RFC 7617 (issue #66)
                    return process.env[`BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] != null;
                }
            }
            
            // OAuth2 security
            if (scheme.type === 'oauth2') {
                // Check for pre-existing token
                if (process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`]) {
                    return true;
                }
                
                // Check for client credentials for auto-acquisition
                if (process.env[`OAUTH_CLIENT_ID_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] &&
                    process.env[`OAUTH_CLIENT_SECRET_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`]) {
                    // Verify we have a supported flow
                    if (scheme.flows?.clientCredentials || scheme.flows?.password) {
                        return true;
                    }
                }
                
                return false;
            }
            
            // OpenID Connect
            if (scheme.type === 'openIdConnect') {
                return !!process.env[`OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
            }
            
            return false;
        });
    });

    // If we found matching security scheme(s), apply them
    if (appliedSecurity) {
        // Apply each security scheme from this requirement (combined with AND)
        for (const [schemeName, scopesArray] of Object.entries(appliedSecurity)) {
            const scheme = allSecuritySchemes[schemeName];
            
            // API Key security
            if (scheme?.type === 'apiKey') {
                const apiKey = process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                if (apiKey) {
                    if (scheme.in === 'header') {
                        headers[scheme.name.toLowerCase()] = apiKey;
                        console.error(`Applied API key '${schemeName}' in header '${scheme.name}'`);
                    }
                    else if (scheme.in === 'query') {
                        queryParams[scheme.name] = apiKey;
                        console.error(`Applied API key '${schemeName}' in query parameter '${scheme.name}'`);
                    }
                    else if (scheme.in === 'cookie') {
                        // Add the cookie, preserving other cookies if they exist
                        headers['cookie'] = `${scheme.name}=${apiKey}${headers['cookie'] ? `; ${headers['cookie']}` : ''}`;
                        console.error(`Applied API key '${schemeName}' in cookie '${scheme.name}'`);
                    }
                }
            } 
            // HTTP security (Bearer or Basic)
            else if (scheme?.type === 'http') {
                if (scheme.scheme?.toLowerCase() === 'bearer') {
                    const token = process.env[`BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    if (token) {
                        headers['authorization'] = `Bearer ${token}`;
                        console.error(`Applied Bearer token for '${schemeName}'`);
                    }
                } 
                else if (scheme.scheme?.toLowerCase() === 'basic') {
                    const username = process.env[`BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    const password = process.env[`BASIC_PASSWORD_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    // Empty password is valid per RFC 7617 (issue #66); only username is required.
                    if (username != null) {
                        headers['authorization'] = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
                        console.error(`Applied Basic authentication for '${schemeName}'`);
                    }
                }
            }
            // OAuth2 security
            else if (scheme?.type === 'oauth2') {
                // First try to use a pre-provided token
                let token = process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                
                // If no token but we have client credentials, try to acquire a token
                if (!token && (scheme.flows?.clientCredentials || scheme.flows?.password)) {
                    console.error(`Attempting to acquire OAuth token for '${schemeName}'`);
                    token = (await acquireOAuth2Token(schemeName, scheme)) ?? '';
                }
                
                // Apply token if available
                if (token) {
                    headers['authorization'] = `Bearer ${token}`;
                    console.error(`Applied OAuth2 token for '${schemeName}'`);
                    
                    // List the scopes that were requested, if any
                    const scopes = scopesArray as string[];
                    if (scopes && scopes.length > 0) {
                        console.error(`Requested scopes: ${scopes.join(', ')}`);
                    }
                }
            }
            // OpenID Connect
            else if (scheme?.type === 'openIdConnect') {
                const token = process.env[`OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                if (token) {
                    headers['authorization'] = `Bearer ${token}`;
                    console.error(`Applied OpenID Connect token for '${schemeName}'`);
                    
                    // List the scopes that were requested, if any
                    const scopes = scopesArray as string[];
                    if (scopes && scopes.length > 0) {
                        console.error(`Requested scopes: ${scopes.join(', ')}`);
                    }
                }
            }
        }
    } 
    // Log warning if security is required but not available
    else if (definition.securityRequirements?.length > 0) {
        // First generate a more readable representation of the security requirements
        const securityRequirementsString = definition.securityRequirements
            .map(req => {
                const parts = Object.entries(req)
                    .map(([name, scopesArray]) => {
                        const scopes = scopesArray as string[];
                        if (scopes.length === 0) return name;
                        return `${name} (scopes: ${scopes.join(', ')})`;
                    })
                    .join(' AND ');
                return `[${parts}]`;
            })
            .join(' OR ');
            
        console.warn(`Tool '${toolName}' requires security: ${securityRequirementsString}, but no suitable credentials found.`);
    }
    

    // Prepare the axios request configuration
    const config: AxiosRequestConfig = {
      method: definition.method.toUpperCase(),
      url: requestUrl,
      params: queryParams,
      headers: headers,
      // Serialize array query params as comma-separated values (issue #41)
      paramsSerializer: (params: Record<string, any>) => {
        const search = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (value === undefined || value === null) continue;
          search.append(key, Array.isArray(value) ? value.join(',') : String(value));
        }
        return search.toString();
      },
      ...(requestBodyData !== undefined && { data: requestBodyData }),
    };

    // Log request info to stderr (doesn't affect MCP output)
    console.error(`Executing tool "${toolName}": ${config.method} ${config.url}`);

    // Execute the request
    const response = await axios(config);

    // Process and format the response
    let responseText = '';
    // Coerce header value to string before lowercasing (issue #65)
    const contentType = String(response.headers['content-type'] ?? '').toLowerCase();
    
    // Handle JSON responses
    if (contentType.includes('application/json') && typeof response.data === 'object' && response.data !== null) {
         try { 
             responseText = JSON.stringify(response.data, null, 2); 
         } catch (e) { 
             responseText = "[Stringify Error]"; 
         }
    } 
    // Handle string responses
    else if (typeof response.data === 'string') { 
         responseText = response.data; 
    }
    // Handle other response types
    else if (response.data !== undefined && response.data !== null) { 
         responseText = String(response.data); 
    }
    // Handle empty responses
    else { 
         responseText = `(Status: ${response.status} - No body content)`; 
    }
    
    // Return formatted response
    return { 
        content: [ 
            { 
                type: "text", 
                text: `API Response (Status: ${response.status}):\n${responseText}` 
            } 
        ], 
    };

  } catch (error: unknown) {
    // Handle errors during execution
    let errorMessage: string;
    
    // Format Axios errors specially
    if (axios.isAxiosError(error)) { 
        errorMessage = formatApiError(error); 
    }
    // Handle standard errors
    else if (error instanceof Error) { 
        errorMessage = error.message; 
    }
    // Handle unexpected error types
    else { 
        errorMessage = 'Unexpected error: ' + String(error); 
    }
    
    // Log error to stderr
    console.error(`Error during execution of tool '${toolName}':`, errorMessage);
    
    // Return error message to client
    return { content: [{ type: "text", text: errorMessage }] };
  }
}


/**
 * Main function to start the server
 */
async function main() {
// Set up stdio transport
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`${SERVER_NAME} MCP Server (v${SERVER_VERSION}) running on stdio${API_BASE_URL ? `, proxying API at ${API_BASE_URL}` : ''}`);
  } catch (error) {
    console.error("Error during server startup:", error);
    process.exit(1);
  }
}

/**
 * Cleanup function for graceful shutdown
 */
async function cleanup() {
    console.error("Shutting down MCP server...");
    process.exit(0);
}

// Register signal handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the server
main().catch((error) => {
  console.error("Fatal error in main execution:", error);
  process.exit(1);
});

/**
 * Formats API errors for better readability
 * 
 * @param error Axios error
 * @returns Formatted error message
 */
function formatApiError(error: AxiosError): string {
    let message = 'API request failed.';
    if (error.response) {
        message = `API Error: Status ${error.response.status} (${error.response.statusText || 'Status text not available'}). `;
        const responseData = error.response.data;
        const MAX_LEN = 200;
        if (typeof responseData === 'string') { 
            message += `Response: ${responseData.substring(0, MAX_LEN)}${responseData.length > MAX_LEN ? '...' : ''}`; 
        }
        else if (responseData) { 
            try { 
                const jsonString = JSON.stringify(responseData); 
                message += `Response: ${jsonString.substring(0, MAX_LEN)}${jsonString.length > MAX_LEN ? '...' : ''}`; 
            } catch { 
                message += 'Response: [Could not serialize data]'; 
            } 
        }
        else { 
            message += 'No response body received.'; 
        }
    } else if (error.request) {
        message = 'API Network Error: No response received from server.';
        if (error.code) message += ` (Code: ${error.code})`;
    } else { 
        message += `API Request Setup Error: ${error.message}`; 
    }
    return message;
}

/**
 * Converts a JSON Schema to a Zod schema for runtime validation
 * 
 * @param jsonSchema JSON Schema
 * @param toolName Tool name for error reporting
 * @returns Zod schema
 */
function getZodSchemaFromJsonSchema(jsonSchema: any, toolName: string): z.ZodTypeAny {
    if (typeof jsonSchema !== 'object' || jsonSchema === null) { 
        return z.object({}).passthrough(); 
    }
    try {
        const zodSchemaString = jsonSchemaToZod(jsonSchema);
        const zodSchema = eval(zodSchemaString);
        if (typeof zodSchema?.parse !== 'function') { 
            throw new Error('Eval did not produce a valid Zod schema.'); 
        }
        return zodSchema as z.ZodTypeAny;
    } catch (err: any) {
        console.error(`Failed to generate/evaluate Zod schema for '${toolName}':`, err);
        return z.object({}).passthrough();
    }
}
