"""In-process smoke test: no subprocess, no network hop to the MCP server.

Talks to the FastMCP server object directly through fastmcp.Client, then
calls one real tool against the Prism mock (which must be running on
PARCELIO_BASE_URL, default http://127.0.0.1:4010).
"""

from __future__ import annotations

import asyncio
import json
import os

from fastmcp import Client

os.environ.setdefault("PARCELIO_API_KEY", "demo")  # Prism accepts any value

from server import mcp  # noqa: E402  (needs env set first)

EXPECTED_TOOL_COUNT = 28  # 29 operations in the spec minus tracking_event_ingest


async def main() -> None:
    async with Client(mcp) as client:
        tools = await client.list_tools()
        names = sorted(t.name for t in tools)
        print(f"tools/list -> {len(tools)} tools")
        print(", ".join(names))
        assert len(tools) == EXPECTED_TOOL_COUNT, f"expected {EXPECTED_TOOL_COUNT}, got {len(tools)}"
        assert "tracking_event_ingest" not in names, "carrier-only op should be excluded"

        by_name = {t.name: t for t in tools}
        dispatch = by_name["dispatchShipment"].description or ""
        print("\ndispatchShipment.description:")
        print("  " + dispatch)
        assert dispatch.startswith("Requires OAuth2 scope shipments:write."), dispatch
        assert "Purchases the label" in dispatch, "override from overrides.py not applied"

        untouched = by_name["listCarriers"].description or ""
        assert not untouched.startswith("Requires OAuth2"), "API-key op must not get the OAuth2 prefix"

        print("\ncall_tool listCarriers {limit: 2} ->")
        result = await client.call_tool("listCarriers", {"limit": 2})
        print(json.dumps(result.structured_content, indent=2))
        # FastMCP wraps non-object-typed outputs (the schema is an allOf) under "result".
        payload = (result.structured_content or {}).get("result", result.structured_content)
        assert payload and "data" in payload, "listCarriers did not return a page of carriers"

    print("\nOK")


if __name__ == "__main__":
    asyncio.run(main())
