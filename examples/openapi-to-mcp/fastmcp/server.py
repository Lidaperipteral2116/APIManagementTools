"""Parcelio Shipments API as an MCP server, generated at start-up by FastMCP.

Run:   python server.py            (stdio transport)
Env:   PARCELIO_BASE_URL   default http://127.0.0.1:4010 (the Prism mock)
       PARCELIO_API_KEY    sent as X-API-Key on every request
       PARCELIO_OAUTH_TOKEN sent as Authorization: Bearer on every request
       PARCELIO_SPEC       optional path override for the OpenAPI file
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import httpx2
import yaml
from fastmcp import FastMCP
from fastmcp.server.providers.openapi import MCPType, RouteMap
from fastmcp.utilities.openapi import HTTPRoute

from overrides import DESCRIPTION_OVERRIDES

# --- locate the shared spec relative to this file, not the cwd -----------------
# examples/openapi-to-mcp/fastmcp/server.py -> repo root is three levels up.
_HERE = Path(__file__).resolve().parent
_DEFAULT_SPEC = _HERE.parents[2] / "specs" / "demo-api.yaml"
SPEC_PATH = Path(os.environ.get("PARCELIO_SPEC", _DEFAULT_SPEC))


def load_spec(path: Path = SPEC_PATH) -> dict[str, Any]:
    if not path.is_file():
        raise SystemExit(
            f"OpenAPI spec not found at {path}. Set PARCELIO_SPEC or run from the repo checkout."
        )
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


# --- HTTP client: base URL and auth headers from the environment ----------------
def build_client() -> httpx2.AsyncClient:
    base_url = os.environ.get("PARCELIO_BASE_URL", "http://127.0.0.1:4010")
    headers: dict[str, str] = {}
    if api_key := os.environ.get("PARCELIO_API_KEY"):
        headers["X-API-Key"] = api_key
    if token := os.environ.get("PARCELIO_OAUTH_TOKEN"):
        headers["Authorization"] = f"Bearer {token}"
    return httpx2.AsyncClient(base_url=base_url, headers=headers, timeout=30.0)


# --- security metadata: FastMCP's HTTPRoute does not carry `security`, so we
#     read it straight from the spec and key it by operationId ------------------
def oauth_scopes_by_operation(spec: dict[str, Any]) -> dict[str, list[str]]:
    """operationId -> OAuth2 scopes, for operations that only accept OAuth2."""
    result: dict[str, list[str]] = {}
    for path_item in spec.get("paths", {}).values():
        for method, op in path_item.items():
            if method not in {"get", "put", "post", "delete", "patch", "head", "options", "trace"}:
                continue
            op_id = op.get("operationId")
            security = op.get("security")  # None means: inherit the global default
            if not op_id or not security:
                continue
            scheme_names = {name for req in security for name in req}
            if scheme_names == {"OAuth2"}:
                result[op_id] = [s for req in security for s in req.get("OAuth2", [])]
    return result


def binary_response_operations(spec: dict[str, Any]) -> set[str]:
    """operationIds whose success response has no JSON representation (PDF, PNG, ...)."""
    result: set[str] = set()
    for path_item in spec.get("paths", {}).values():
        for method, op in path_item.items():
            if not isinstance(op, dict) or "operationId" not in op:
                continue
            for status, resp in op.get("responses", {}).items():
                content = resp.get("content") if isinstance(resp, dict) else None
                if str(status).startswith("2") and content and not any(
                    "json" in media_type for media_type in content
                ):
                    result.add(op["operationId"])
    return result


SPEC = load_spec()
OAUTH_SCOPES = oauth_scopes_by_operation(SPEC)
BINARY_RESPONSE_OPS = binary_response_operations(SPEC)


# --- route maps ----------------------------------------------------------------
# Decision: everything stays a TOOL. FastMCP can turn GET-by-id operations into
# RESOURCE_TEMPLATEs (commented out below), but Claude Desktop and most other
# hosts only auto-invoke tools; resources have to be attached by the user by
# hand. For an API where the model needs to chain getShipment -> dispatch ->
# getShipmentLabel, tools are the only thing that gets called. See README.
ROUTE_MAPS = [
    # Carrier-only ingest endpoint: an agent acting for a shipper must not push
    # tracking scans. Excluded outright so it never appears in tools/list.
    RouteMap(methods=["POST"], pattern=r"^/tracking/events$", mcp_type=MCPType.EXCLUDE),
    # Alternative (not used): expose GET-by-id endpoints as resource templates.
    # RouteMap(methods=["GET"], pattern=r".*\{[^}]+\}$", mcp_type=MCPType.RESOURCE_TEMPLATE),
]


# --- per-component fix-ups ------------------------------------------------------
def customize(route: HTTPRoute, component: Any) -> None:
    """Called once per generated tool/resource/template, before registration."""
    op_id = route.operation_id or ""

    # (a) Fill in descriptions the spec lacks or phones in.
    if op_id in DESCRIPTION_OVERRIDES:
        component.description = DESCRIPTION_OVERRIDES[op_id]

    # (b) Tell the model up front which calls need an OAuth2 token, and which scope.
    if op_id in OAUTH_SCOPES:
        scopes = ", ".join(OAUTH_SCOPES[op_id])
        component.description = f"Requires OAuth2 scope {scopes}. " + (component.description or "").strip()

    # (c) FastMCP derives an output schema from the 200 response even when that
    #     response is a PDF/PNG, then rejects its own non-JSON result with
    #     "has an output schema but did not return structured content".
    #     Dropping the schema lets the bytes through as plain text content.
    if op_id in BINARY_RESPONSE_OPS and hasattr(component, "output_schema"):
        component.output_schema = None


mcp = FastMCP.from_openapi(
    openapi_spec=SPEC,
    client=build_client(),
    name="Parcelio Shipments (FastMCP)",
    route_maps=ROUTE_MAPS,
    mcp_component_fn=customize,
)

if __name__ == "__main__":
    mcp.run()  # stdio
